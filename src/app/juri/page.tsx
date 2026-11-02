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

  if (loading) return <p className="rounded-2xl border border-slate-200 bg-white p-5 text-slate-600 shadow-sm">Memuat event...</p>;

  return (
    <div className="space-y-5">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-orange-600">Ruang kerja juri</p>
        <h2 className="mt-1 text-xl font-black text-blue-950 sm:text-2xl">Pilih Event</h2>
        <p className="mt-1 text-sm text-slate-600">Buka event yang menjadi penugasan Anda untuk mulai menilai.</p>
      </div>

      {events.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center shadow-sm sm:p-10">
          <Calendar className="mx-auto mb-3 h-10 w-10 text-orange-500" />
          <p className="text-slate-600">Anda belum ditugaskan di event manapun</p>
          <p className="mt-1 text-sm text-slate-500">Hubungi admin untuk penugasan</p>
        </div>
      ) : (
        <div className="space-y-3">
          {events.map((event) => (
            <Link
              key={event.id}
              href={`/juri/events/${event.id}`}
              className="group block min-h-20 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-orange-300 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 sm:p-6"
            >
              <div className="flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <h3 className="text-base font-bold text-blue-950 sm:text-lg">{event.name}</h3>
                  <p className="mt-1 text-sm text-slate-600">
                    {new Date(event.date).toLocaleDateString('id-ID', {
                      weekday: 'long',
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                    })}
                  </p>
                </div>
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-orange-50 text-orange-600 transition group-hover:bg-orange-500 group-hover:text-white">
                  <ArrowRight className="h-5 w-5" />
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
