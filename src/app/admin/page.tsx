'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { LDWC_DEFAULT_RUBRIC } from '@/lib/ldwc-rubric';
import { Event, ParticipantCategory, EventScoringTemplate } from '@/types';
import { Plus, Calendar, ArrowRight, Pencil, Trash2, X, Check } from 'lucide-react';
import EventPosterUpload from '@/components/admin/event-poster-upload';
import AdminModalPortal from '@/components/admin/admin-modal-portal';

// ── Komponen Modal Konfirmasi ──────────────────────────────────────────────────
function ConfirmDialog({
  title,
  message,
  confirmLabel = 'Hapus',
  danger = true,
  onConfirm,
  onCancel,
}: {
  title: string;
  message: string;
  confirmLabel?: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <AdminModalPortal onClose={onCancel}>
      <div className="fixed inset-0 z-[100] overflow-y-auto bg-slate-950/50 p-4 backdrop-blur-sm">
        <div className="flex min-h-full items-center justify-center">
          <div
            role="dialog"
            aria-modal="true"
            className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl"
          >
            <h3 className="text-base font-semibold text-slate-900">{title}</h3>
            <p className="mt-2 text-sm text-slate-600">{message}</p>
            <div className="mt-5 flex justify-end gap-2">
              <button
                onClick={onCancel}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Batal
              </button>
              <button
                onClick={onConfirm}
                className={`rounded-lg px-4 py-2 text-sm font-medium text-white ${
                  danger ? 'bg-red-600 hover:bg-red-700' : 'bg-blue-600 hover:bg-blue-700'
                }`}
              >
                {confirmLabel}
              </button>
            </div>
          </div>
        </div>
      </div>
    </AdminModalPortal>
  );
}

// ── Komponen Modal Edit ────────────────────────────────────────────────────────
function EditEventModal({
  event,
  onSave,
  onCancel,
}: {
  event: Event;
  onSave: (updated: Partial<Event>) => Promise<void>;
  onCancel: () => void;
}) {
  const [namaEvent, setNamaEvent] = useState(event.name);
  const [deskripsi, setDeskripsi] = useState(event.description ?? '');
  const [fotoUrl, setFotoUrl] = useState(event.image_url ?? '');
  const [lokasi, setLokasi] = useState(event.location ?? '');
  const [tanggal, setTanggal] = useState(event.date);
  const [waktuMulai, setWaktuMulai] = useState(event.start_time?.slice(0, 5) ?? '');
  const [waktuSelesai, setWaktuSelesai] = useState(event.end_time?.slice(0, 5) ?? '');
  const [batasMenit, setBatasMenit] = useState(Math.floor(event.batas_waktu_detik / 60));
  const [status, setStatus] = useState<Event['status']>(event.status);
  const [template, setTemplate] = useState<EventScoringTemplate>(event.scoring_template);
  const [categories, setCategories] = useState<ParticipantCategory[]>(event.categories);
  const [saving, setSaving] = useState(false);
  const [uploadingPoster, setUploadingPoster] = useState(false);

  async function handleSubmit() {
    if (!namaEvent.trim() || !lokasi.trim() || !tanggal || categories.length === 0) return;
    setSaving(true);
    await onSave({
      name: namaEvent.trim(),
      description: deskripsi.trim(),
      image_url: fotoUrl.trim() || null,
      location: lokasi.trim(),
      date: tanggal,
      start_time: waktuMulai || null,
      end_time: waktuSelesai || null,
      batas_waktu_detik: batasMenit * 60,
      status,
      scoring_template: template,
      categories,
    });
    setSaving(false);
  }

  return (
    <AdminModalPortal onClose={onCancel}>
      <div className="fixed inset-0 z-[100] overflow-y-auto bg-slate-950/50 p-3 backdrop-blur-sm sm:p-6">
        <div className="flex min-h-full items-center justify-center">
        <div className="flex max-h-[calc(100dvh-1.5rem)] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl sm:max-h-[calc(100dvh-3rem)]">
        <div className="flex shrink-0 items-center justify-between border-b border-slate-100 bg-white px-5 py-4 sm:px-7">
          <div>
            <h3 className="text-lg font-black text-blue-950">Edit Event</h3>
            <p className="mt-0.5 text-xs text-slate-500">Perbarui informasi dan poster perlombaan.</p>
          </div>
          <button onClick={onCancel} className="rounded p-1 text-slate-400 hover:text-slate-600">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="grid gap-4 p-5 sm:grid-cols-2 sm:p-7">
          {/* Nama Event */}
          <div className="sm:col-span-2">
            <label className="mb-1 block text-sm font-medium text-slate-700">Nama Event</label>
            <input
              value={namaEvent}
              onChange={(e) => setNamaEvent(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
              placeholder="Nama event"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="mb-1 block text-sm font-medium text-slate-700">Deskripsi</label>
            <textarea
              value={deskripsi}
              onChange={(e) => setDeskripsi(e.target.value)}
              rows={3}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              placeholder="Ceritakan informasi lomba"
            />
          </div>
          <div className="sm:col-span-2">
            <EventPosterUpload
              value={fotoUrl}
              onChange={setFotoUrl}
              onUploadingChange={setUploadingPoster}
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Lokasi</label>
            <input
              required
              value={lokasi}
              onChange={(e) => setLokasi(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
              placeholder="Contoh: Lapangan Utama"
            />
          </div>

          <div className="grid grid-cols-2 gap-3 sm:col-span-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Waktu mulai</label>
              <input
                type="time"
                value={waktuMulai}
                onChange={(e) => setWaktuMulai(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Waktu selesai</label>
              <input
                type="time"
                value={waktuSelesai}
                onChange={(e) => setWaktuSelesai(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:col-span-2">
            {/* Tanggal */}
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Tanggal</label>
              <input
                type="date"
                value={tanggal}
                onChange={(e) => setTanggal(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
              />
            </div>

            {/* Batas Waktu */}
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
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
              />
            </div>
          </div>

          {/* Status */}
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Status</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as Event['status'])}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
            >
              <option value="draft">Draft</option>
              <option value="aktif">Aktif</option>
              <option value="selesai">Selesai</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Template penilaian</label>
            <select
              value={template}
              onChange={(e) => setTemplate(e.target.value as EventScoringTemplate)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            >
              <option value="LDWC_2026">LDWC 2026</option>
              <option value="LEGACY">Legacy (data penilaian lama)</option>
            </select>
            <p className="mt-1 text-xs text-slate-500">
              Ganti template hanya jika event belum memiliki penilaian yang disubmit.
            </p>
          </div>
          <fieldset className="sm:col-span-2">
            <legend className="mb-1 block text-sm font-medium text-slate-700">Kategori peserta</legend>
            <div className="flex gap-4">
              {(['U15', 'U19'] as const).map((category) => (
                <label key={category} className="flex items-center gap-2 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    checked={categories.includes(category)}
                    onChange={(e) =>
                      setCategories((current) =>
                        e.target.checked
                          ? [...current, category]
                          : current.filter((value) => value !== category)
                      )
                    }
                  />
                  {category}
                </label>
              ))}
            </div>
          </fieldset>
        </div>

        </div>
        <div className="flex shrink-0 justify-end gap-2 border-t border-slate-100 bg-white px-5 py-4 sm:px-7">
          <button
            onClick={onCancel}
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Batal
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving || uploadingPoster || !namaEvent.trim() || !lokasi.trim() || !tanggal}
            className="flex items-center gap-1.5 rounded-lg bg-orange-500 px-4 py-2 text-sm font-bold text-white transition hover:bg-orange-600 disabled:opacity-50"
          >
            <Check className="h-4 w-4" />
            {saving ? 'Menyimpan...' : 'Simpan'}
          </button>
        </div>
        </div>
      </div>
    </div>
    </AdminModalPortal>
  );
}

// ── Halaman Utama ──────────────────────────────────────────────────────────────
const STATUS_STYLE: Record<string, string> = {
  aktif: 'bg-green-100 text-green-700',
  selesai: 'bg-slate-100 text-slate-700',
  draft: 'bg-amber-100 text-amber-700',
};

export default function AdminEventsPage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);

  // Buat event baru
  const [showForm, setShowForm] = useState(false);
  const [namaEvent, setNamaEvent] = useState('');
  const [deskripsiEvent, setDeskripsiEvent] = useState('');
  const [fotoEventUrl, setFotoEventUrl] = useState('');
  const [uploadingPoster, setUploadingPoster] = useState(false);
  const [lokasi, setLokasi] = useState('');
  const [tanggal, setTanggal] = useState('');
  const [waktuMulai, setWaktuMulai] = useState('');
  const [waktuSelesai, setWaktuSelesai] = useState('');
  const [batasMenit, setBatasMenit] = useState(7);
  const [newCategories, setNewCategories] = useState<ParticipantCategory[]>(['U15', 'U19']);
  const [creating, setCreating] = useState(false);

  // Edit
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);

  // Delete
  const [deleteTarget, setDeleteTarget] = useState<Event | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    loadEvents();
  }, []);

  async function loadEvents() {
    const supabase = createClient();
    const { data } = await supabase
      .from('events')
      .select('*')
      .order('created_at', { ascending: false });
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
      name: namaEvent,
      description: deskripsiEvent.trim(),
      image_url: fotoEventUrl.trim() || null,
      location: lokasi.trim(),
      date: tanggal,
      start_time: waktuMulai || null,
      end_time: waktuSelesai || null,
      batas_waktu_detik: batasMenit * 60,
      created_by: user?.id ?? null,
      scoring_template: 'LDWC_2026',
      rubric: LDWC_DEFAULT_RUBRIC,
      categories: newCategories,
    });

    if (error) {
      alert('Gagal: ' + error.message);
    } else {
      setShowForm(false);
      setNamaEvent('');
      setDeskripsiEvent('');
      setFotoEventUrl('');
      setLokasi('');
      setTanggal('');
      setWaktuMulai('');
      setWaktuSelesai('');
      setBatasMenit(7);
      setNewCategories(['U15', 'U19']);
      await loadEvents();
    }
    setCreating(false);
  }

  async function handleSaveEdit(updated: Partial<Event>) {
    if (!editingEvent) return;
    const res = await fetch('/api/admin/update-event', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ eventId: editingEvent.id, ...updated }),
    });
    const result = await res.json();
    if (!res.ok) {
      alert('Gagal update: ' + (result.error || 'Unknown error'));
    } else {
      setEditingEvent(null);
      await loadEvents();
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    const res = await fetch('/api/admin/delete-event', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ eventId: deleteTarget.id }),
    });
    const result = await res.json();
    if (!res.ok) {
      alert('Gagal hapus: ' + (result.error || 'Unknown error'));
    } else {
      setDeleteTarget(null);
      await loadEvents();
    }
    setDeleting(false);
  }

  if (loading) return <p className="text-slate-600">Memuat...</p>;

  return (
    <div className="space-y-4">
      {/* ── Modal Edit ── */}
      {editingEvent && (
        <EditEventModal
          event={editingEvent}
          onSave={handleSaveEdit}
          onCancel={() => setEditingEvent(null)}
        />
      )}

      {/* ── Modal Konfirmasi Hapus ── */}
      {deleteTarget && (
        <ConfirmDialog
          title={`Hapus "${deleteTarget.name}"?`}
          message="Semua data terkait (peserta, penilaian, indikator, juri) akan ikut terhapus secara permanen. Aksi ini tidak bisa dibatalkan."
          confirmLabel={deleting ? 'Menghapus...' : 'Hapus Event'}
          danger
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}

      {/* ── Header ── */}
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

      {/* ── Form Buat Event ── */}
      {showForm && (
        <form onSubmit={handleCreate} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 bg-white px-5 py-4 sm:px-6">
            <h3 className="font-black text-blue-950">Buat Event Baru</h3>
            <p className="mt-1 text-xs text-slate-500">Lengkapi detail lomba dan tambahkan poster agar mudah dikenali.</p>
          </div>
          <div className="grid gap-4 p-5 sm:grid-cols-2 sm:p-6">
            <div className="sm:col-span-2">
              <label className="mb-1 block text-sm font-medium text-slate-700">Nama Event</label>
              <input
                required
                value={namaEvent}
                onChange={(e) => setNamaEvent(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                placeholder="Lobba Anashera Part III"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1 block text-sm font-medium text-slate-700">Deskripsi</label>
              <textarea
                value={deskripsiEvent}
                onChange={(e) => setDeskripsiEvent(e.target.value)}
                rows={3}
                className="w-full rounded-lg border border-slate-300 px-3 py-2"
                placeholder="Ceritakan informasi lomba"
              />
            </div>
            <div className="sm:col-span-2">
              <EventPosterUpload
                value={fotoEventUrl}
                onChange={setFotoEventUrl}
                onUploadingChange={setUploadingPoster}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Lokasi</label>
              <input
                required
                value={lokasi}
                onChange={(e) => setLokasi(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                placeholder="Contoh: Lapangan Utama"
              />
            </div>
            <div className="grid grid-cols-2 gap-3 sm:col-span-2">
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
            <div className="grid grid-cols-2 gap-3 sm:col-span-2">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Waktu mulai</label>
                <input
                  type="time"
                  value={waktuMulai}
                  onChange={(e) => setWaktuMulai(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Waktu selesai</label>
                <input
                  type="time"
                  value={waktuSelesai}
                  onChange={(e) => setWaktuSelesai(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2"
                />
              </div>
            </div>
            <fieldset className="sm:col-span-2">
              <legend className="mb-1 block text-sm font-medium text-slate-700">Kategori peserta</legend>
              <div className="flex gap-4">
                {(['U15', 'U19'] as const).map((category) => (
                  <label key={category} className="flex items-center gap-2 text-sm text-slate-700">
                    <input
                      type="checkbox"
                      checked={newCategories.includes(category)}
                      onChange={(e) =>
                        setNewCategories((current) =>
                          e.target.checked
                            ? [...current, category]
                            : current.filter((value) => value !== category)
                        )
                      }
                    />
                    {category}
                  </label>
                ))}
              </div>
              <p className="mt-1 text-xs text-slate-500">Template penilaian: LDWC 2026</p>
            </fieldset>
          </div>
          <div className="flex justify-end gap-2 border-t border-slate-100 bg-slate-50/70 px-5 py-4 sm:px-6">
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={creating || uploadingPoster || newCategories.length === 0}
              className="rounded-lg bg-orange-500 px-4 py-2 text-sm font-bold text-white transition hover:bg-orange-600 disabled:opacity-50"
            >
              {creating ? 'Membuat...' : 'Buat Event'}
            </button>
          </div>
        </form>
      )}

      {/* ── List Event ── */}
      {events.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center">
          <Calendar className="mx-auto mb-2 h-10 w-10 text-slate-400" />
          <p className="text-slate-600">Belum ada event. Klik tombol di atas untuk membuat.</p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {events.map((event) => (
            <div
              key={event.id}
              className="group flex flex-col rounded-xl border border-slate-200 bg-white p-4 transition hover:border-blue-400 hover:shadow-md"
            >
              {/* Konten Card — bisa diklik ke detail */}
              <Link href={`/admin/events/${event.id}`} className="block flex-1">
                <div className="mb-2">
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      STATUS_STYLE[event.status] ?? 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {event.status}
                  </span>
                </div>
                <h3 className="font-semibold text-slate-900">{event.name}</h3>
                <p className="mt-1 text-xs font-medium text-blue-700">
                  {event.scoring_template === 'LEGACY' ? 'Legacy' : 'LDWC 2026'} ·{' '}
                  {event.categories?.join(' / ')}
                </p>
                <p className="mt-1 text-sm text-slate-600">
                  {new Date(event.date).toLocaleDateString('id-ID', {
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

              {/* Baris bawah: tombol aksi + panah */}
              <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3">
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setEditingEvent(event)}
                    className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-slate-500 hover:bg-slate-100 hover:text-blue-600"
                    title="Edit event"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                    Edit
                  </button>
                  <button
                    onClick={() => setDeleteTarget(event)}
                    className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-slate-500 hover:bg-red-50 hover:text-red-600"
                    title="Hapus event"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Hapus
                  </button>
                </div>
                <Link
                  href={`/admin/events/${event.id}`}
                  className="rounded-lg p-1 text-slate-400 hover:text-blue-600"
                >
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}