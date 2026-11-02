import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
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
  const eventId = new URL(request.url).searchParams.get('id');
  let eventQuery = supabase
    .from('events')
    .select('id, name, description, image_url, date, start_time, end_time, location, status')
    .order('date', { ascending: false });
  if (eventId) eventQuery = eventQuery.eq('id', eventId);
  const [{ data: events, error: eventError }, { data: participants, error: participantError }] =
    await Promise.all([
      eventQuery,
      (() => {
        let participantQuery = supabase
          .from('participants')
          .select('id, event_id, nama_regu, nomor_urut, category')
          .order('nomor_urut');
        if (eventId) participantQuery = participantQuery.eq('event_id', eventId);
        return participantQuery;
      })(),
    ]);

  const failed = eventError ?? participantError;
  if (failed) {
    console.error('[public/events] failed to load public event data:', failed);
    return NextResponse.json(
      { error: 'Gagal memuat data event.' },
      { status: 500, headers: { 'Cache-Control': 'no-store' } },
    );
  }

  const participantsByEvent = new Map<string, NonNullable<typeof participants>>();
  for (const participant of participants ?? []) {
    const eventParticipants = participantsByEvent.get(participant.event_id) ?? [];
    eventParticipants.push(participant);
    participantsByEvent.set(participant.event_id, eventParticipants);
  }

  return NextResponse.json(
    {
      events: (events ?? []).map((event) => ({
        ...event,
        participants: participantsByEvent.get(event.id) ?? [],
      })),
    },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}
