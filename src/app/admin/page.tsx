'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { Event } from '@/types';
import { Plus, Calendar, ArrowRight } from 'lucide-react';

export default function AdminEventsPage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [namaEvent, setNamaEvent] = useState('');
  const [tanggal, setTanggal] = useState('');
  const [batasMenit, setBatasMenit] = useState(7);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    loadEvents();
  }, []);

  async function loadEvents() {
    const supabase = createClient();
    const { data } = await supabase.from('events').select('*').order('created_at', { ascending: false });
    setEvents(data || []);
    setLoading(false);
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { error } = await supabase.from('events').insert({
      nama_event: namaEvent,
      tanggal,
      batas_waktu_detik: batasMenit * 60,
      created_by: user?.id,
    });

    if (error) {
      alert('Gagal: ' + error.message);
    } else {
      setShowForm(false);
      setNamaEvent('');
      setTanggal('');
      setBatasMenit(7);
      await loadEvents();
    }
    setCreating(false);
  }

  if (loading) return <p className="text-slate-600">Memuat...</p>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-slate-900">Daftar Event</h2>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          <Plus className="h-4 w-4" />
          Buat Event Baru
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className="rounded-xl border border-slate-200 bg-white p-4">
          <h3 className="mb-3 font-semibold text-slate-900">Event Baru</h3>
          <div className="space-y-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Nama Event</label>
              <input
                required
                value={namaEvent}
                onChange={(e) => setNamaEvent(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                placeholder="Lobba Anashera Part III"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Tanggal</label>
                <input
                  required
                  type="date"
                  value={tanggal}
                  onChange={(e) => setTanggal(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Batas Waktu (menit)
                </label>
                <input
                  type="number"
                  min={1}
                  max={60}
                  value={batasMenit}
                  onChange={(e) => setBatasMenit(parseInt(e.target.value) || 7)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={creating}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {creating ? 'Membuat...' : 'Buat Event'}
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Batal
              </button>
            </div>
          </div>
        </form>
      )}

      {events.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center">
          <Calendar className="mx-auto mb-2 h-10 w-10 text-slate-400" />
          <p className="text-slate-600">Belum ada event. Klik tombol di atas untuk membuat.</p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {events.map((event) => (
            <Link
              key={event.id}
              href={`/admin/events/${event.id}`}
              className="group rounded-xl border border-slate-200 bg-white p-4 transition hover:border-blue-500 hover:shadow-md"
            >
              <div className="mb-2 flex items-center justify-between">
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                    event.status === 'aktif'
                      ? 'bg-green-100 text-green-700'
                      : event.status === 'selesai'
                        ? 'bg-slate-100 text-slate-700'
                        : 'bg-amber-100 text-amber-700'
                  }`}
                >
                  {event.status}
                </span>
                <ArrowRight className="h-4 w-4 text-slate-400 group-hover:text-blue-600" />
              </div>
              <h3 className="font-semibold text-slate-900">{event.nama_event}</h3>
              <p className="mt-1 text-sm text-slate-600">
                {new Date(event.tanggal).toLocaleDateString('id-ID', {
                  weekday: 'long',
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                })}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                Batas waktu: {Math.floor(event.batas_waktu_detik / 60)} menit
              </p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
