import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    return NextResponse.json(
      { error: 'Konfigurasi database server belum lengkap.' },
      { status: 500, headers: { 'Cache-Control': 'no-store' } }
    );
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data: announcements, error: announcementError } = await supabase
    .from('event_award_announcements')
    .select('event_id, awards, announced_at')
    .order('announced_at', { ascending: false });

  if (announcementError) {
    console.error('[public/announcements] failed to load announcements:', announcementError);
    return NextResponse.json(
      { error: 'Gagal memuat pengumuman juara.' },
      { status: 500, headers: { 'Cache-Control': 'no-store' } }
    );
  }
  if (!announcements?.length) {
    return NextResponse.json({ announcements: [] }, { headers: { 'Cache-Control': 'no-store' } });
  }

  const eventIds = announcements.map(({ event_id }) => event_id);
  const { data: events, error: eventError } = await supabase
    .from('events')
    .select('id, name, date, location, image_url')
    .in('id', eventIds);
  if (eventError) {
    console.error('[public/announcements] failed to load event details:', eventError);
    return NextResponse.json(
      { error: 'Gagal memuat detail event untuk pengumuman.' },
      { status: 500, headers: { 'Cache-Control': 'no-store' } }
    );
  }

  const eventsById = new Map((events ?? []).map((event) => [event.id, event]));
  return NextResponse.json(
    {
      announcements: announcements.flatMap((announcement) => {
        const event = eventsById.get(announcement.event_id);
        return event ? [{ ...announcement, event }] : [];
      }),
    },
    { headers: { 'Cache-Control': 'no-store' } }
  );
}
