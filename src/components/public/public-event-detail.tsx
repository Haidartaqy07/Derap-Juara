'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { CalendarDays, MapPin, Users } from 'lucide-react';
import { formatEventDate } from '@/components/public/public-events-list';

type PublicEvent = {
  id: string;
  name: string;
  description: string | null;
  image_url: string | null;
  date: string;
  start_time: string | null;
  end_time: string | null;
  location: string | null;
  status: 'draft' | 'aktif' | 'selesai';
  participants: { id: string; nama_regu: string; nomor_urut: number; category: string }[];
};

export default function PublicEventDetail({ eventId }: { eventId: string }) {
  const [event, setEvent] = useState<PublicEvent | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function loadEvent() {
      try {
        const response = await fetch(`/api/public/events?id=${encodeURIComponent(eventId)}`, {
          cache: 'no-store',
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error ?? 'Gagal memuat detail event.');
        setEvent(result.events?.[0] ?? null);
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : 'Gagal memuat detail event.');
      } finally {
        setLoading(false);
      }
    }
    void loadEvent();
  }, [eventId]);

  return (
    <main className="min-h-screen bg-[#f7f8fc] text-slate-950">
      <section className="mx-auto max-w-7xl px-5 py-8 sm:px-8 sm:py-12 lg:px-12">
        {loading ? (
          <p className="rounded-xl border border-slate-200 bg-white p-6 text-slate-600">
            Memuat detail event...
          </p>
        ) : error ? (
          <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">
            Gagal memuat event: {error}
          </p>
        ) : !event ? (
          <p className="rounded-xl border border-slate-200 bg-white p-8 text-center text-slate-600">
            Event tidak ditemukan.
          </p>
        ) : (
          <article>
            <div className="grid gap-8 md:grid-cols-[minmax(240px,360px)_1fr] md:items-center">
              <div className="relative aspect-[3/4] overflow-hidden rounded-2xl bg-gradient-to-br from-blue-100 to-orange-100 shadow-sm">
                {event.image_url ? (
                  <Image
                    src={event.image_url}
                    alt={`Poster ${event.name}`}
                    fill
                    priority
                    unoptimized
                    sizes="(max-width: 768px) 100vw, 360px"
                    className="object-cover"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center p-8 text-center">
                    <span className="text-3xl font-black text-blue-950/50">{event.name}</span>
                  </div>
                )}
              </div>
              <div>
                <span className="inline-flex rounded-full border border-orange-200 bg-orange-50 px-3 py-1 text-xs font-bold text-orange-700">
                  Detail Event
                </span>
                <h1 className="mt-4 text-3xl font-black tracking-tight text-blue-950 sm:text-4xl">
                  {event.name}
                </h1>
                <p className="mt-2 text-sm font-medium text-slate-500">{event.status}</p>
                <p className="mt-5 flex items-start gap-3 text-sm text-slate-700">
                  <CalendarDays className="mt-0.5 h-5 w-5 shrink-0 text-orange-600" />
                  {formatEventDate(event.date, event.start_time, event.end_time)}
                </p>
                {event.location && (
                  <p className="mt-3 flex items-start gap-3 text-sm text-slate-700">
                    <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-orange-600" />
                    {event.location}
                  </p>
                )}
                <div className="mt-6 border-t border-slate-200 pt-5">
                  <h2 className="font-bold text-blue-950">Tentang lomba</h2>
                  <p className="mt-2 whitespace-pre-line text-sm leading-7 text-slate-600">
                    {event.description?.trim() || 'Deskripsi event belum tersedia.'}
                  </p>
                </div>
                <p className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-slate-600">
                  <Users className="h-4 w-4" />
                  {event.participants.length} tim peserta
                </p>
              </div>
            </div>

            {event.participants.length > 0 && (
              <section className="mt-12">
                <h2 className="text-xl font-black text-blue-950">Tim yang bertanding</h2>
                <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {event.participants.map((participant) => (
                    <div
                      key={participant.id}
                      className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-4"
                    >
                      <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 font-mono font-bold text-blue-950">
                        {participant.nomor_urut}
                      </span>
                      <span>
                        <span className="block font-bold text-slate-900">{participant.nama_regu}</span>
                        <span className="text-xs text-slate-500">{participant.category}</span>
                      </span>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </article>
        )}
      </section>
    </main>
  );
}
