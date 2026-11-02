import { randomUUID } from 'crypto';
import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { createClient as createServerClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const IMAGE_TYPES = {
  'image/jpeg': { extension: 'jpg', signature: (bytes: Uint8Array) => bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff },
  'image/png': { extension: 'png', signature: (bytes: Uint8Array) => bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47 },
  'image/webp': { extension: 'webp', signature: (bytes: Uint8Array) => bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46 && bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50 },
} as const;

export async function POST(request: Request) {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Silakan masuk sebagai admin.' }, { status: 401 });

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();
  if (profileError || profile?.role !== 'admin') {
    return NextResponse.json({ error: 'Hanya admin yang dapat mengunggah poster.' }, { status: 403 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    console.error('[admin/upload-event-image] storage server configuration is incomplete');
    return NextResponse.json({ error: 'Penyimpanan gambar belum dikonfigurasi.' }, { status: 500 });
  }

  const contentLength = Number(request.headers.get('content-length'));
  if (Number.isFinite(contentLength) && contentLength > MAX_FILE_SIZE + 64 * 1024) {
    return NextResponse.json({ error: 'Ukuran gambar maksimal 5 MB.' }, { status: 413 });
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: 'Data unggahan tidak valid.' }, { status: 400 });
  }

  const file = formData.get('file');
  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'Pilih file gambar terlebih dahulu.' }, { status: 400 });
  }
  if (file.size === 0 || file.size > MAX_FILE_SIZE) {
    return NextResponse.json({ error: 'Ukuran gambar harus lebih dari 0 dan maksimal 5 MB.' }, { status: 413 });
  }

  const imageType = IMAGE_TYPES[file.type as keyof typeof IMAGE_TYPES];
  if (!imageType) {
    return NextResponse.json({ error: 'Format gambar yang didukung: JPG, PNG, atau WebP.' }, { status: 415 });
  }

  const fileBytes = new Uint8Array(await file.arrayBuffer());
  if (!imageType.signature(fileBytes)) {
    return NextResponse.json({ error: 'Isi file tidak sesuai dengan format gambar.' }, { status: 415 });
  }

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const path = `event-posters/${randomUUID()}.${imageType.extension}`;
  const { error: uploadError } = await admin.storage
    .from('event-posters')
    .upload(path, fileBytes, { contentType: file.type, upsert: false });

  if (uploadError) {
    console.error('[admin/upload-event-image] upload failed:', uploadError);
    return NextResponse.json({ error: 'Gagal menyimpan gambar. Coba lagi.' }, { status: 500 });
  }

  const { data } = admin.storage.from('event-posters').getPublicUrl(path);
  return NextResponse.json({ imageUrl: data.publicUrl }, { status: 201 });
}
