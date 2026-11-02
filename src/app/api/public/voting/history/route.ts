import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    return NextResponse.json(
      { error: 'Konfigurasi database server belum lengkap.' },
      { status: 500, headers: { 'Cache-Control': 'no-store' } },
    );
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data: payments, error } = await supabase
    .from('voting_payments')
    .select('id, event_id, participant_id, quantity, paid_at')
    .eq('status', 'paid')
    .not('paid_at', 'is', null)
    .order('paid_at', { ascending: false })
    .limit(50);

  if (error) {
    console.error('[public/voting/history] failed to load verified votes:', error);
    return NextResponse.json(
      { error: 'Gagal memuat riwayat voting.' },
      { status: 500, headers: { 'Cache-Control': 'no-store' } },
    );
  }

  const eventIds = [...new Set((payments ?? []).map((payment) => payment.event_id))];
  const participantIds = [...new Set((payments ?? []).map((payment) => payment.participant_id))];
  const [{ data: events, error: eventError }, { data: participants, error: participantError }] =
    eventIds.length > 0 && participantIds.length > 0
      ? await Promise.all([
          supabase.from('events').select('id, name').in('id', eventIds),
          supabase.from('participants').select('id, nama_regu').in('id', participantIds),
        ])
      : [{ data: [], error: null }, { data: [], error: null }];

  const lookupError = eventError ?? participantError;
  if (lookupError) {
    console.error('[public/voting/history] failed to resolve verified vote labels:', lookupError);
    return NextResponse.json(
      { error: 'Gagal memuat riwayat voting.' },
      { status: 500, headers: { 'Cache-Control': 'no-store' } },
    );
  }

  const eventNames = new Map((events ?? []).map((event) => [event.id, event.name]));
  const participantNames = new Map(
    (participants ?? []).map((participant) => [participant.id, participant.nama_regu]),
  );
  return NextResponse.json(
    {
      history: (payments ?? []).map((payment) => ({
        id: payment.id,
        event_name: eventNames.get(payment.event_id) ?? 'Event',
        participant_name: participantNames.get(payment.participant_id) ?? 'Tim',
        quantity: payment.quantity,
        paid_at: payment.paid_at,
      })),
    },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}
