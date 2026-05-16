import { NextResponse } from 'next/server';
import { createClient as createServerClient } from '@/lib/supabase/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';

export async function POST(req: Request) {
  // Verifikasi caller adalah admin
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();
  if (profile?.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden — admin only' }, { status: 403 });
  }

  const { email, password, username, tipeJuri, eventId } = await req.json();

  if (!email || !password || !username || !tipeJuri || !eventId) {
    return NextResponse.json({ error: 'Field tidak lengkap' }, { status: 400 });
  }

  if (!['juri1', 'juri2', 'juri3'].includes(tipeJuri)) {
    return NextResponse.json({ error: 'Tipe juri tidak valid' }, { status: 400 });
  }

  // Pakai admin client (service role) untuk buat user
  const admin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  // 1. Buat user di Supabase Auth
  const { data: newUser, error: createErr } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (createErr || !newUser.user) {
    return NextResponse.json({ error: createErr?.message || 'Gagal buat user' }, { status: 500 });
  }

  // 2. Buat profile dengan role
  const { error: profileErr } = await admin
    .from('profiles')
    .insert({ id: newUser.user.id, username, role: tipeJuri });

  if (profileErr) {
    // Rollback: hapus user yang baru dibuat
    await admin.auth.admin.deleteUser(newUser.user.id);
    return NextResponse.json({ error: profileErr.message }, { status: 500 });
  }

  // 3. Tugaskan ke event
  const { error: judgeErr } = await admin
    .from('event_judges')
    .insert({ event_id: eventId, user_id: newUser.user.id, tipe_juri: tipeJuri });

  if (judgeErr) {
    return NextResponse.json({ error: judgeErr.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
