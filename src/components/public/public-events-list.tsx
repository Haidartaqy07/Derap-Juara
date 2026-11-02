'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { CalendarDays, MapPin, Search } from 'lucide-react';

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
};

const STATUS_LABEL: Record<PublicEvent['status'], string> = {
  draft: 'Akan datang',
  aktif: 'Aktif',
  selesai: 'Selesai',
};

export default function PublicEventsList() {
  const [events, setEvents] = useState<PublicEvent[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function loadEvents() {
      try {
        const response = await fetch('/api/public/events', { cache: 'no-store' });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error ?? 'Gagal memuat daftar event.');
        setEvents(result.events ?? []);
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : 'Gagal memuat daftar event.');
      } finally {
        setLoading(false);
      }
    }
    void loadEvents();
  }, []);

  const visibleEvents = events.filter((event) =>
    event.name.toLocaleLowerCase('id-ID').includes(search.trim().toLocaleLowerCase('id-ID')),
  );

  return (
    <main className="min-h-screen bg-[#f7f8fc] text-slate-950">
      <section className="mx-auto max-w-7xl px-5 py-10 sm:px-8 sm:py-14 lg:px-12">
        <div className="mb-7">
          <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-orange-600">
            JELAJAHI EVENT
          </p>
          <h1 className="mt-2 text-3xl font-black tracking-tight text-blue-950 sm:text-4xl">Event</h1>
          <p className="mt-2 text-sm text-slate-600">
            Temukan event dan kompetisi Paskibra yang akan berlangsung.
          </p>
        </div>

        <label className="mb-6 flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
          <Search className="h-4 w-4 shrink-0 text-slate-400" />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Cari event"
            className="w-full bg-transparent text-sm outline-none placeholder:text-slate-400"
          />
        </label>

        {loading ? (
          <p className="rounded-xl border border-slate-200 bg-white p-6 text-slate-600">
            Memuat event...
          </p>
        ) : error ? (
          <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">
            Gagal memuat event: {error}
          </p>
        ) : visibleEvents.length === 0 ? (
          <p className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center text-slate-600">
            {search ? 'Event tidak ditemukan.' : 'Belum ada event yang ditampilkan.'}
          </p>
        ) : (
          <>
            <p className="mb-3 text-xs text-slate-500">
              Menampilkan {visibleEvents.length} dari {events.length} event
            </p>
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {visibleEvents.map((event) => (
                <Link
                  key={event.id}
                  href={`/events/${event.id}`}
                  className="group overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
                >
                  <div className="relative aspect-[3/4] overflow-hidden bg-gradient-to-br from-blue-100 to-orange-100">
                    {event.image_url ? (
                      <Image
                        src={event.image_url}
                        alt={`Poster ${event.name}`}
                        fill
                        unoptimized
                        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                        className="object-cover transition duration-300 group-hover:scale-105"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center p-8 text-center">
                        <span className="text-2xl font-black text-blue-950/50">{event.name}</span>
                      </div>
                    )}
                    <span className="absolute left-3 top-3 rounded-full bg-white/95 px-2.5 py-1 text-xs font-bold text-emerald-700 shadow-sm">
                      {STATUS_LABEL[event.status]}
                    </span>
                  </div>
                  <div className="p-4">
                    <h2 className="line-clamp-2 min-h-12 font-extrabold text-blue-950">
                      {event.name}
                    </h2>
                    <p className="mt-2 flex items-center gap-2 text-xs text-slate-500">
                      <CalendarDays className="h-3.5 w-3.5 shrink-0" />
                      {formatEventDate(event.date, event.start_time, event.end_time)}
                    </p>
                    {event.location && (
                      <p className="mt-1 flex items-center gap-2 text-xs text-slate-500">
                        <MapPin className="h-3.5 w-3.5 shrink-0" />
                        <span className="truncate">{event.location}</span>
                      </p>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          </>
        )}
      </section>
    </main>
  );
}

export function formatEventDate(date: string, startTime: string | null, endTime: string | null) {
  const formattedDate = new Date(`${date}T00:00:00`).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
  const start = startTime?.slice(0, 5);
  const end = endTime?.slice(0, 5);
  const time = start && end ? `${start}–${end} WIB` : start ? `${start} WIB` : '';
  return time ? `${formattedDate} · ${time}` : formattedDate;
}
