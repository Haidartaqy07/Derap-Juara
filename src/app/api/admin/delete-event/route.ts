import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } },
);

export async function DELETE(req: Request) {
  try {
    const { eventId } = await req.json();

    if (!eventId) {
      return NextResponse.json({ error: 'eventId wajib diisi' }, { status: 400 });
    }

    // ── 1. Ambil semua peserta untuk dapatkan penilaian IDs ──
    const { data: pesertaList } = await supabaseAdmin
      .from('peserta')
      .select('id')
      .eq('event_id', eventId);

    const pesertaIds = (pesertaList ?? []).map((p) => p.id);

    if (pesertaIds.length > 0) {
      // ── 2. Ambil penilaian IDs ──
      const { data: penilaianPbb } = await supabaseAdmin
        .from('penilaian_pbb')
        .select('id')
        .in('peserta_id', pesertaIds);

      const { data: penilaianVarfor } = await supabaseAdmin
        .from('penilaian_varfor')
        .select('id')
        .in('peserta_id', pesertaIds);

      const pbbIds = (penilaianPbb ?? []).map((p) => p.id);
      const varforIds = (penilaianVarfor ?? []).map((p) => p.id);

      // ── 3. Hapus nilai detail ──
      if (pbbIds.length > 0) {
        const { error: e } = await supabaseAdmin
          .from('nilai_detail_pbb')
          .delete()
          .in('penilaian_id', pbbIds);
        if (e) console.error('[delete-event] nilai_detail_pbb:', e.message);
      }

      if (varforIds.length > 0) {
        const { error: e } = await supabaseAdmin
          .from('nilai_detail_varfor')
          .delete()
          .in('penilaian_id', varforIds);
        if (e) console.error('[delete-event] nilai_detail_varfor:', e.message);
      }

      // ── 4. Hapus penilaian ──
      if (pbbIds.length > 0) {
        const { error: e } = await supabaseAdmin
          .from('penilaian_pbb')
          .delete()
          .in('peserta_id', pesertaIds);
        if (e) console.error('[delete-event] penilaian_pbb:', e.message);
      }

      if (varforIds.length > 0) {
        const { error: e } = await supabaseAdmin
          .from('penilaian_varfor')
          .delete()
          .in('peserta_id', pesertaIds);
        if (e) console.error('[delete-event] penilaian_varfor:', e.message);
      }

      // ── 5. Hapus peserta ──
      const { error: pesertaErr } = await supabaseAdmin
        .from('peserta')
        .delete()
        .in('id', pesertaIds);
      if (pesertaErr) console.error('[delete-event] peserta:', pesertaErr.message);
    }

    // ── 6. Hapus indikator_pbb ──
    const { error: indErr } = await supabaseAdmin
      .from('indikator_pbb')
      .delete()
      .eq('event_id', eventId);
    if (indErr) console.error('[delete-event] indikator_pbb:', indErr.message);

    // ── 7. Hapus event_judges ──
    const { error: ejErr } = await supabaseAdmin
      .from('event_judges')
      .delete()
      .eq('event_id', eventId);
    if (ejErr) console.error('[delete-event] event_judges:', ejErr.message);

    // ── 8. Hapus rekap_nilai_peserta jika ada ──
    const { error: rekapErr } = await supabaseAdmin
      .from('rekap_nilai_peserta')
      .delete()
      .eq('event_id', eventId);
    if (rekapErr) console.error('[delete-event] rekap_nilai_peserta:', rekapErr.message);

    // ── 9. Hapus event ──
    const { error: eventErr } = await supabaseAdmin
      .from('events')
      .delete()
      .eq('id', eventId);

    if (eventErr) {
      console.error('[delete-event] events:', eventErr.message);
      return NextResponse.json({ error: eventErr.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('[delete-event] unexpected:', err);
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}