'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  ChevronDown,
  Clock3,
  MapPin,
  Medal,
  QrCode,
  Search,
  ShieldCheck,
  Users,
  Vote,
  X,
} from 'lucide-react';

type Participant = {
  id: string;
  nama_regu: string;
  nomor_urut: number;
  category: string;
};

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
  participants: Participant[];
};

type VoteHistoryEntry = {
  id: string;
  event_name: string;
  participant_name: string;
  quantity: number;
  paid_at: string;
};

type ModalState =
  | { type: 'event'; event: PublicEvent }
  | { type: 'payment'; event: PublicEvent; participant: Participant }
  | null;

const STATUS_LABEL: Record<PublicEvent['status'], string> = {
  draft: 'Akan datang',
  aktif: 'Aktif',
  selesai: 'Selesai',
};

export default function PublicVotingPage() {
  const [events, setEvents] = useState<PublicEvent[]>([]);
  const [history, setHistory] = useState<VoteHistoryEntry[]>([]);
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState<ModalState>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [error, setError] = useState('');
  const [historyError, setHistoryError] = useState('');

  useEffect(() => {
    void loadEvents();
    void loadHistory();
  }, []);

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

  async function loadHistory() {
    try {
      const response = await fetch('/api/public/voting/history', { cache: 'no-store' });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? 'Gagal memuat riwayat voting.');
      setHistory(result.history ?? []);
    } catch (loadError) {
      setHistoryError(
        loadError instanceof Error ? loadError.message : 'Gagal memuat riwayat voting.',
      );
    } finally {
      setHistoryLoading(false);
    }
  }

  const filteredEvents = events.filter((event) =>
    `${event.name} ${event.location ?? ''}`.toLocaleLowerCase('id-ID')
      .includes(search.trim().toLocaleLowerCase('id-ID')),
  );
  const nomineeCount = events.reduce((total, event) => total + event.participants.length, 0);

  return (
    <main className="min-h-screen bg-[#f7f8fc] text-slate-950">
      <section className="mx-auto max-w-7xl px-5 py-8 sm:px-8 lg:px-12">
        <div className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-blue-950 via-blue-900 to-slate-900 p-6 text-white shadow-xl shadow-blue-950/15 sm:p-8 lg:p-10">
          <div className="pointer-events-none absolute -right-10 -top-20 h-72 w-72 rounded-full border border-white/10" />
          <div className="pointer-events-none absolute -right-2 -top-12 h-56 w-56 rounded-full border border-orange-300/20" />
          <div className="pointer-events-none absolute bottom-0 left-0 h-1.5 w-2/3 bg-gradient-to-r from-orange-400 via-orange-300 to-transparent" />
          <div className="relative grid gap-8 md:grid-cols-[1fr_270px] md:items-center">
            <div>
              <span className="inline-flex items-center gap-2 rounded-full border border-orange-300/30 bg-white/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-orange-200">
                <ShieldCheck className="h-3.5 w-3.5" />
                Dukung tim pilihanmu
              </span>
              <h1 className="mt-4 text-4xl font-black tracking-tight text-white sm:text-5xl">
                Suara untuk
                <span className="block text-orange-300">Sang Juara.</span>
              </h1>
              <p className="mt-3 max-w-xl text-sm leading-6 text-blue-100/80">
                Temukan kompetisi, kenali setiap tim, lalu berikan dukunganmu pada event yang sedang berlangsung.
              </p>
              <div className="mt-7 flex flex-wrap gap-3">
                <StatCard icon={<Vote className="h-4 w-4 text-orange-500" />} value={events.length} label="Event" />
                <StatCard icon={<Users className="h-4 w-4 text-blue-600" />} value={nomineeCount} label="Tim peserta" />
              </div>
            </div>
            <div className="space-y-3">
              <label className="flex items-center gap-3 rounded-2xl border border-white/15 bg-white/10 p-3 text-white shadow-sm backdrop-blur">
                <Search className="h-4 w-4 shrink-0 text-orange-200" />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Cari event atau kota..."
                  className="min-w-0 flex-1 bg-transparent text-xs outline-none placeholder:text-blue-100/60"
                />
              </label>
              <a
                href="#panduan-voting"
                className="flex items-center justify-between rounded-2xl border border-white/15 bg-white p-4 text-blue-950 shadow-sm transition hover:bg-orange-50"
              >
                <span>
                  <span className="block text-[10px] font-black uppercase tracking-[0.16em] text-orange-600">
                    Cara berpartisipasi
                  </span>
                  <span className="mt-1 block text-sm font-extrabold text-blue-950">Dukung tim favorit</span>
                  <span className="block text-xs text-slate-600">Lihat alur voting</span>
                </span>
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-orange-500 text-white">
                  <ArrowRight className="h-4 w-4" />
                </span>
              </a>
            </div>
          </div>
        </div>

        <section className="mt-7" aria-labelledby="event-list-heading">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-orange-600">Kompetisi</p>
          <div className="mt-1 flex items-center justify-between gap-4">
            <h2 id="event-list-heading" className="text-xl font-black text-blue-950">
              {loading ? 'Memuat event...' : `${filteredEvents.length} event tersedia`}
            </h2>
            <button
              type="button"
              onClick={() => setHistoryOpen((open) => !open)}
              aria-expanded={historyOpen}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-blue-950 shadow-sm transition hover:border-orange-300 hover:bg-orange-50"
            >
              Riwayat voting
              <ChevronDown className={`h-4 w-4 transition ${historyOpen ? 'rotate-180' : ''}`} />
            </button>
          </div>

          {historyOpen && (
            <div className="mt-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <h3 className="font-extrabold text-blue-950">Vote berhasil tercatat</h3>
              <p className="mt-1 text-xs text-slate-500">
                Riwayat publik hanya memuat event, tim, jumlah suara, dan waktu. Data pribadi tidak ditampilkan.
              </p>
              {historyLoading ? (
                <p className="mt-4 text-sm text-slate-500">Memuat riwayat...</p>
              ) : historyError ? (
                <p role="alert" className="mt-4 text-sm text-red-700">{historyError}</p>
              ) : history.length === 0 ? (
                <p className="mt-4 rounded-xl bg-slate-50 p-4 text-sm text-slate-500">
                  Belum ada pembayaran terverifikasi yang tercatat.
                </p>
              ) : (
                <ul className="mt-3 divide-y divide-slate-100">
                  {history.map((item) => (
                    <li key={item.id} className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm">
                      <span>
                        <strong className="text-slate-900">{item.participant_name}</strong>
                        <span className="text-slate-500"> · {item.event_name} · {item.quantity} suara</span>
                      </span>
                      <time className="text-xs text-slate-500" dateTime={item.paid_at}>
                        {formatDateTime(item.paid_at)}
                      </time>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {error ? (
            <p role="alert" className="mt-4 rounded-xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">
              Gagal memuat event: {error}
            </p>
          ) : !loading && filteredEvents.length === 0 ? (
            <p className="mt-4 rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center text-slate-600">
              Event tidak ditemukan.
            </p>
          ) : (
            <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {filteredEvents.map((event) => (
                <article
                  key={event.id}
                  className="group overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
                >
                  <button
                    type="button"
                    onClick={() => setModal({ type: 'event', event })}
                    className="block w-full text-left"
                    aria-label={`Lihat detail ${event.name} dan tim peserta`}
                  >
                    <div className="relative aspect-[1.25/1] overflow-hidden bg-gradient-to-br from-blue-100 to-orange-100">
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
                        <div className="flex h-full items-center justify-center p-6 text-center">
                          <span className="text-xl font-black text-blue-950/50">{event.name}</span>
                        </div>
                      )}
                      <span className={`absolute left-3 top-3 rounded-md px-2.5 py-1 text-[10px] font-extrabold text-white ${
                            event.status === 'aktif' ? 'bg-emerald-600' : event.status === 'selesai' ? 'bg-slate-700' : 'bg-orange-500'
                      }`}>
                        {STATUS_LABEL[event.status]}
                      </span>
                      <span className="absolute inset-x-0 bottom-0 flex items-center justify-between bg-gradient-to-t from-black/70 to-transparent px-3 pb-3 pt-8 text-[10px] font-bold text-white">
                        <span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3" />{event.location ?? 'Lokasi belum diatur'}</span>
                        <span>{formatDate(event.date)}</span>
                      </span>
                    </div>
                    <div className="p-3.5">
                      <h3 className="line-clamp-2 min-h-10 text-sm font-black text-blue-950">{event.name}</h3>
                      <span className="mt-2 inline-flex rounded-lg bg-slate-100 px-3 py-2 text-[10px] font-black uppercase tracking-wider text-slate-500">
                        Nominee&nbsp; {event.participants.length}
                      </span>
                      <div className="mt-3 flex items-center justify-between gap-2">
                        <span className="text-xs font-black text-orange-600">Rp1.000/suara</span>
                        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-950 text-orange-200">
                          <ArrowRight className="h-4 w-4" />
                        </span>
                      </div>
                    </div>
                  </button>
                </article>
              ))}
            </div>
          )}
        </section>

        <section id="panduan-voting" className="mt-8 rounded-2xl border border-blue-100 bg-white p-5 shadow-sm">
          <h2 className="font-black text-blue-950">Alur dukungan</h2>
          <p className="mt-1 text-sm leading-6 text-slate-600">
            Buka event untuk melihat detail dan daftar tim, lalu pilih tim yang ingin didukung. Harga saat ini
            Rp1.000 per suara. Pembayaran QRIS belum tersedia karena provider belum dipilih; tidak ada biaya
            atau vote yang diproses sampai integrasi pembayaran diaktifkan.
          </p>
        </section>
      </section>

      {modal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-sm"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setModal(null);
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="voting-modal-title"
            className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl border-t-4 border-orange-400 bg-white shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <button
                type="button"
                onClick={() =>
                  setModal(modal.type === 'payment' ? { type: 'event', event: modal.event } : null)
                }
                className="inline-flex items-center gap-2 text-sm font-bold text-slate-600 hover:text-blue-950"
              >
                <ArrowLeft className="h-4 w-4" />
                {modal.type === 'payment' ? 'Detail event' : 'Semua event'}
              </button>
              <button type="button" onClick={() => setModal(null)} aria-label="Tutup" className="rounded-full p-2 text-slate-500 hover:bg-slate-100">
                <X className="h-5 w-5" />
              </button>
            </div>

            {modal.type === 'event' ? (
              <div className="p-5 sm:p-6">
                <div className="grid gap-5 sm:grid-cols-[180px_1fr]">
                  <div className="relative aspect-[3/4] overflow-hidden rounded-2xl bg-gradient-to-br from-blue-100 to-orange-100">
                    {modal.event.image_url && (
                      <Image
                        src={modal.event.image_url}
                        alt={`Poster ${modal.event.name}`}
                        fill
                        unoptimized
                        sizes="180px"
                        className="object-cover"
                      />
                    )}
                  </div>
                  <div>
                    <span className="inline-flex rounded-full bg-orange-50 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-orange-700">
                      Detail event
                    </span>
                    <h2 id="voting-modal-title" className="mt-3 text-2xl font-black text-blue-950">
                      {modal.event.name}
                    </h2>
                    <p className="mt-3 flex gap-2 text-sm text-slate-600"><CalendarDays className="h-4 w-4 shrink-0 text-orange-500" />{formatDate(modal.event.date)}</p>
                    {modal.event.start_time && (
                      <p className="mt-2 flex gap-2 text-sm text-slate-600"><Clock3 className="h-4 w-4 shrink-0 text-orange-500" />{modal.event.start_time.slice(0, 5)}{modal.event.end_time ? `–${modal.event.end_time.slice(0, 5)}` : ''} WIB</p>
                    )}
                    {modal.event.location && (
                      <p className="mt-2 flex gap-2 text-sm text-slate-600"><MapPin className="h-4 w-4 shrink-0 text-orange-500" />{modal.event.location}</p>
                    )}
                    <p className="mt-4 whitespace-pre-line text-sm leading-6 text-slate-600">
                      {modal.event.description?.trim() || 'Deskripsi event belum tersedia.'}
                    </p>
                  </div>
                </div>
                <div className="mt-6">
                  <h3 className="font-black text-slate-900">Tim yang bertanding ({modal.event.participants.length})</h3>
                  {modal.event.participants.length === 0 ? (
                    <p className="mt-3 rounded-xl bg-slate-50 p-4 text-sm text-slate-500">Daftar tim belum tersedia.</p>
                  ) : (
                    <ul className="mt-3 space-y-2">
                      {modal.event.participants.map((participant) => (
                        <li key={participant.id} className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 p-3">
                          <span className="flex min-w-0 items-center gap-3">
                            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-950 font-mono font-bold text-orange-200">{participant.nomor_urut}</span>
                            <span className="min-w-0">
                              <span className="block truncate text-sm font-bold text-slate-900">{participant.nama_regu}</span>
                              <span className="text-xs text-slate-500">{participant.category}</span>
                            </span>
                          </span>
                          <button
                            type="button"
                            disabled={modal.event.status !== 'aktif'}
                            onClick={() => setModal({ type: 'payment', event: modal.event, participant })}
                            className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-orange-500 px-3 py-2 text-xs font-bold text-white transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:bg-slate-300"
                          >
                            <Vote className="h-3.5 w-3.5" /> Pilih
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                  {modal.event.status !== 'aktif' && (
                    <p className="mt-3 text-xs text-slate-500">Voting hanya tersedia untuk event berstatus aktif.</p>
                  )}
                </div>
              </div>
            ) : (
              <div className="p-6 sm:p-8">
                <span className="inline-flex items-center gap-2 rounded-full bg-orange-50 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-orange-700">
                  <QrCode className="h-3.5 w-3.5" /> Konfirmasi dukungan
                </span>
                <h2 id="voting-modal-title" className="mt-3 text-2xl font-black text-blue-950">
                  Dukung {modal.participant.nama_regu}
                </h2>
                <p className="mt-1 text-sm text-slate-500">{modal.event.name} · 1 suara</p>
                <div className="mt-5 flex items-center justify-between rounded-2xl bg-slate-50 p-4">
                  <span className="text-sm font-semibold text-slate-600">Total pembayaran</span>
                  <strong className="text-xl font-black text-blue-950">Rp1.000</strong>
                </div>
                <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900">
                  Provider QRIS belum dipilih. Pembayaran belum dapat diproses dan vote belum dihitung. Setelah
                  provider dikonfigurasi, status berhasil hanya akan ditampilkan setelah webhook provider
                  memverifikasi pembayaran.
                </div>
                <button
                  type="button"
                  disabled
                  className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-slate-300 px-5 py-3.5 text-sm font-extrabold text-slate-600"
                  title="Integrasi QRIS belum dikonfigurasi"
                >
                  <QrCode className="h-4 w-4" />
                  Pembayaran QRIS belum tersedia
                </button>
              </div>
            )}
          </section>
        </div>
      )}
    </main>
  );
}

function StatCard({ icon, value, label }: { icon: React.ReactNode; value: number; label: string }) {
  return (
    <div className="min-w-32 rounded-2xl border border-white/15 bg-white/10 p-3 backdrop-blur">
      <span className="flex items-center gap-2">{icon}</span>
      <span className="mt-1 block text-xl font-black leading-none text-white">{value}</span>
      <span className="mt-1 block text-[9px] font-black uppercase tracking-[0.18em] text-blue-100/60">{label}</span>
    </div>
  );
}

function formatDate(value: string) {
  return new Date(`${value}T00:00:00`).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function formatDateTime(value: string) {
  return new Date(value).toLocaleString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}
