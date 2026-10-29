import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { createClient as createServerClient } from '@/lib/supabase/server';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } },
);

export async function PUT(req: Request) {
  try {
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();
    if (profileError || profile?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden — admin only' }, { status: 403 });
    }

    const { eventId, name, date, batas_waktu_detik, status } = await req.json();

    if (!eventId || !name?.trim() || !date) {
      return NextResponse.json(
        { error: 'eventId, name, dan date wajib diisi' },
        { status: 400 },
      );
    }

    const ALLOWED_STATUS = ['draft', 'aktif', 'selesai'];
    if (status && !ALLOWED_STATUS.includes(status)) {
      return NextResponse.json({ error: 'Status tidak valid' }, { status: 400 });
    }

    const { error } = await supabaseAdmin
      .from('events')
      .update({
        name: name.trim(),
        date,
        batas_waktu_detik: Number(batas_waktu_detik),
        ...(status ? { status } : {}),
      })
      .eq('id', eventId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}