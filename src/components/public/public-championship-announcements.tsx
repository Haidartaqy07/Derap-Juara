'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import {
  type AwardWinner,
  type ChampionshipAward,
  type ChampionshipCategoryAwards,
} from '@/lib/championship-awards';
import { Award, CalendarDays, MapPin, Medal, Trophy } from 'lucide-react';

type Announcement = {
  event_id: string;
  awards: ChampionshipCategoryAwards[];
  announced_at: string;
  event: {
    id: string;
    name: string;
    date: string;
    location: string | null;
    image_url: string | null;
  };
};

function awardGroupId(eventId: string, category: string, title: string) {
  const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  return `award-${eventId}-${category.toLowerCase()}-${slug}`;
}

export default function PublicChampionshipAnnouncements() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function load() {
      try {
        const response = await fetch('/api/public/announcements', { cache: 'no-store' });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error ?? 'Gagal memuat pengumuman juara.');
        setAnnouncements(result.announcements ?? []);
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : 'Gagal memuat pengumuman juara.');
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, []);

  return (
    <main className="min-h-screen bg-[#f7f8fc] text-slate-950">
      <section className="mx-auto max-w-7xl px-5 py-10 sm:px-8 sm:py-14 lg:px-12">
        <div className="mb-8">
          <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-orange-600">HASIL RESMI LOMBA</p>
          <h1 className="mt-2 text-3xl font-black tracking-tight text-blue-950 sm:text-4xl">Pengumuman Juara</h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-600">
            Daftar juara ditampilkan setelah panitia mengumumkan hasil resmi setiap event.
          </p>
        </div>

        {loading ? (
          <p className="rounded-2xl border border-slate-200 bg-white p-6 text-slate-600">Memuat pengumuman...</p>
        ) : error ? (
          <p role="alert" className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">{error}</p>
        ) : announcements.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
            <Trophy className="mx-auto h-10 w-10 text-orange-500" />
            <h2 className="mt-3 font-bold text-blue-950">Belum ada pengumuman</h2>
            <p className="mt-1 text-sm text-slate-600">Hasil juara akan tampil di sini setelah diumumkan panitia.</p>
          </div>
        ) : (
          <div className="space-y-8">
            {announcements.map((announcement) => (
              <article key={announcement.event_id} className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
                <header className="relative isolate min-h-56 overflow-hidden bg-blue-950">
                  {announcement.event.image_url && (
                    <Image
                      src={announcement.event.image_url}
                      alt={`Poster ${announcement.event.name}`}
                      fill
                      unoptimized
                      sizes="100vw"
                      className="absolute inset-0 -z-20 object-cover opacity-25"
                    />
                  )}
                  <div className="absolute inset-0 -z-10 bg-gradient-to-r from-blue-950 via-blue-950/90 to-blue-950/55" />
                  <div className="relative p-6 text-white sm:p-8">
                    <p className="text-xs font-bold uppercase tracking-[0.18em] text-orange-300">Pemenang resmi</p>
                    <h2 className="mt-2 text-2xl font-black sm:text-3xl">{announcement.event.name}</h2>
                    <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-sm text-blue-100">
                      <span className="inline-flex items-center gap-1.5">
                        <CalendarDays className="h-4 w-4 text-orange-300" />
                        {new Date(`${announcement.event.date}T00:00:00`).toLocaleDateString('id-ID', {
                          day: 'numeric', month: 'long', year: 'numeric',
                        })}
                      </span>
                      {announcement.event.location && (
                        <span className="inline-flex items-center gap-1.5">
                          <MapPin className="h-4 w-4 text-orange-300" />
                          {announcement.event.location}
                        </span>
                      )}
                    </div>
                  </div>
                </header>

                <div className="space-y-8 p-5 sm:p-8">
                  {announcement.awards.map((category) => (
                    <section key={category.category}>
                      <div className="mb-5 flex items-center gap-3 border-b-2 border-orange-200 pb-3">
                        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-100 text-orange-700">
                          <Medal className="h-5 w-5" />
                        </span>
                        <div>
                          <p className="text-xs font-bold uppercase tracking-[0.16em] text-orange-600">Kategori</p>
                          <h3 className="text-xl font-black text-blue-950">{category.category}</h3>
                        </div>
                      </div>
                      <nav aria-label={`Navigasi penghargaan ${category.category}`} className="mb-5 flex gap-2 overflow-x-auto pb-2">
                        {Array.from(new Set(category.awards.filter((item) => item.winners.length > 0).map((item) => item.title)))
                          .map((title) => (
                            <a
                              key={title}
                              href={`#${awardGroupId(announcement.event_id, category.category, title)}`}
                              className="shrink-0 rounded-full border border-blue-100 bg-blue-50 px-3 py-1.5 text-xs font-bold text-blue-900 transition hover:border-orange-300 hover:bg-orange-50 hover:text-orange-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-500"
                            >
                              {title}
                            </a>
                          ))}
                      </nav>
                      <div className="space-y-6">
                        {Array.from(new Set(category.awards.filter((item) => item.winners.length > 0).map((item) => item.title)))
                          .map((title) => {
                            const awards = category.awards.filter(
                              (item) => item.title === title && item.winners.length > 0
                            );
                            return (
                              <section
                                key={title}
                                id={awardGroupId(announcement.event_id, category.category, title)}
                                className="scroll-mt-24"
                              >
                                <div className="mb-3 flex items-center gap-3">
                                  <span className="h-1 w-8 rounded-full bg-orange-500" />
                                  <h4 className="text-sm font-extrabold uppercase tracking-wide text-blue-950">{title}</h4>
                                  <span className="h-px flex-1 bg-slate-200" />
                                </div>
                                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                                  {awards.map((item) => <PublicAwardCard key={item.key} item={item} />)}
                                </div>
                              </section>
                            );
                          })}
                      </div>
                    </section>
                  ))}
                  <p className="text-right text-xs text-slate-400">
                    Diumumkan {new Date(announcement.announced_at).toLocaleString('id-ID')}
                  </p>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}

function PublicAwardCard({ item }: { item: ChampionshipAward }) {
  const isWeighted = item.winners[0]?.details.some((detail) => detail.weight !== null) ?? false;
  return (
    <article className={`overflow-hidden rounded-2xl border ${
      item.key === 'umum' ? 'border-orange-300 bg-orange-50/60 shadow-md shadow-orange-900/5' : 'border-slate-200 bg-white'
    }`}>
      <header className="flex items-center gap-2 border-b border-slate-100 px-4 py-3">
        <Award className="h-4 w-4 text-orange-600" />
        <div>
          <h4 className="font-bold text-blue-950">{item.title}</h4>
          <p className="text-xs text-slate-500">{item.placement}</p>
        </div>
      </header>
      <div className="space-y-3 p-4">
        {item.winners.map((winner) => <PublicWinner key={winner.participantId} winner={winner} isWeighted={isWeighted} />)}
      </div>
    </article>
  );
}

function PublicWinner({ winner, isWeighted }: { winner: AwardWinner; isWeighted: boolean }) {
  return (
    <div className="rounded-xl bg-white p-3 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-xs font-bold text-orange-700">{winner.category} · Regu #{winner.nomor_urut}</p>
          <p className="mt-0.5 font-extrabold text-blue-950">{winner.nama_regu}</p>
        </div>
        <span className="shrink-0 rounded-lg bg-blue-950 px-2 py-1 font-mono text-xs font-bold text-orange-200">
          {winner.score.toFixed(2)}{isWeighted ? ' poin' : ''}
        </span>
      </div>
      <details className="mt-3 border-t border-slate-100 pt-2">
        <summary className="cursor-pointer select-none text-xs font-semibold text-slate-500">Detail perhitungan</summary>
        <div className="mt-2 space-y-1">
          {winner.details.map((detail) => (
            <div key={detail.label} className="flex justify-between gap-2 text-[11px]">
              <span className="text-slate-500">{detail.label}{detail.weight === null ? '' : ` (${detail.weight}%)`}</span>
              <span className="shrink-0 font-mono text-slate-700">
                {detail.raw.toFixed(2)}/{detail.maximum}
                {detail.weight === null ? '' : ` → ${detail.points.toFixed(2)}`}
              </span>
            </div>
          ))}
        </div>
      </details>
    </div>
  );
}
