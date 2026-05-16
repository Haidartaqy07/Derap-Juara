'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { Event } from '@/types';
import { Calendar, ArrowRight } from 'lucide-react';

export default function JuriEventsPage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      // Ambil event di mana user ini ditugaskan sebagai juri
      const { data } = await supabase
        .from('event_judges')
        .select('events(*)')
        .eq('user_id', user.id);

      const list = (data || []).map((d: any) => d.events).filter(Boolean) as Event[];
      // Sort terbaru dulu
      list.sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
      setEvents(list);
      setLoading(false);
    })();
  }, []);

  if (loading) return <p className="text-slate-600">Memuat...</p>;

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold text-slate-900">Pilih Event</h2>

      {events.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center">
          <Calendar className="mx-auto mb-2 h-10 w-10 text-slate-400" />
          <p className="text-slate-600">Anda belum ditugaskan di event manapun</p>
          <p className="mt-1 text-sm text-slate-500">Hubungi admin untuk penugasan</p>
        </div>
      ) : (
        <div className="space-y-3">
          {events.map((event) => (
            <Link
              key={event.id}
              href={`/juri/events/${event.id}`}
              className="group block rounded-xl border border-slate-200 bg-white p-4 transition hover:border-blue-500 hover:shadow-md"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-slate-900">{event.nama_event}</h3>
                  <p className="mt-1 text-sm text-slate-600">
                    {new Date(event.tanggal).toLocaleDateString('id-ID', {
                      weekday: 'long',
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                    })}
                  </p>
                </div>
                <ArrowRight className="h-5 w-5 text-slate-400 group-hover:text-blue-600" />
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
