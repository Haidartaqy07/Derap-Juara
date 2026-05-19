import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } },
);

export async function PUT(req: Request) {
  try {
    const { eventId, nama_event, tanggal, batas_waktu_detik, status } = await req.json();

    if (!eventId || !nama_event?.trim() || !tanggal) {
      return NextResponse.json(
        { error: 'eventId, nama_event, dan tanggal wajib diisi' },
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
        nama_event: nama_event.trim(),
        tanggal,
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