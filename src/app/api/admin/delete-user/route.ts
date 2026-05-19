import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } },
);

export async function DELETE(req: Request) {
  try {
    const { userId } = await req.json();

    if (!userId) {
      return NextResponse.json({ error: 'userId wajib diisi' }, { status: 400 });
    }

    // ── 1. Hapus semua tabel yang mereferensikan user ini (urutan FK) ──

    const { error: pbbError } = await supabaseAdmin
      .from('penilaian_pbb')
      .delete()
      .eq('juri_id', userId);
    if (pbbError) console.error('[delete-user] penilaian_pbb:', pbbError.message);

    const { error: ejError } = await supabaseAdmin
      .from('event_judges')
      .delete()
      .eq('user_id', userId);
    if (ejError) console.error('[delete-user] event_judges:', ejError.message);

    // ── 2. Hapus profiles ──
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .delete()
      .eq('id', userId);

    if (profileError) {
      console.error('[delete-user] profiles:', profileError.message);
      return NextResponse.json(
        {
          error:
            `Gagal menghapus profil: ${profileError.message}. ` +
            'Pastikan semua relasi FK sudah dihapus terlebih dahulu.',
        },
        { status: 500 },
      );
    }

    // ── 3. Hapus dari Supabase Auth ──
    const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(userId);
    if (authError) {
      console.error('[delete-user] auth:', authError.message);
      return NextResponse.json({ error: authError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('[delete-user] unexpected:', err);
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}