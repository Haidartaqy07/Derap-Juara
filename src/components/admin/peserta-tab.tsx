'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Peserta } from '@/types';
import { Plus, Trash2, Clock, ListOrdered, Check, X } from 'lucide-react';
import { formatWaktu } from '@/lib/scoring';
import ConfirmDialog from '@/components/confirm-dialog';

export default function PesertaTab({ eventId }: { eventId: string }) {
  const [peserta, setPeserta] = useState<Peserta[]>([]);
  const [loading, setLoading] = useState(true);
  const [namaRegu, setNamaRegu] = useState('');
  const [saving, setSaving] = useState(false);
  const [pesanError, setPesanError] = useState<string | null>(null);

  const [hapusTarget, setHapusTarget] = useState<Peserta | null>(null);
  const [menghapus, setMenghapus] = useState(false);

  // Mode panel Set Nomor Urut
  const [modeSetNomor, setModeSetNomor] = useState(false);

  useEffect(() => {
    load();
  }, [eventId]);

  async function load() {
    const supabase = createClient();
    const { data } = await supabase
      .from('peserta')
      .select('*')
      .eq('event_id', eventId)
      .order('nomor_urut', { ascending: true, nullsFirst: false });
    setPeserta(data || []);
    setLoading(false);
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setPesanError(null);

    setSaving(true);
    const supabase = createClient();
    // Peserta baru ditambah tanpa nomor urut — diatur belakangan lewat panel
    const { error } = await supabase.from('peserta').insert({
      event_id: eventId,
      nama_regu: namaRegu.trim(),
      nomor_urut: null,
    });

    if (error) {
      setPesanError('Gagal menyimpan: ' + error.message);
    } else {
      setNamaRegu('');
      await load();
    }
    setSaving(false);
  }

  async function handleDelete() {
    if (!hapusTarget) return;
    setMenghapus(true);
    const supabase = createClient();
    await supabase.from('peserta').delete().eq('id', hapusTarget.id);
    setMenghapus(false);
    setHapusTarget(null);
    await load();
  }

  async function handleUpdateWaktu(id: string, detik: number | null) {
    const supabase = createClient();
    await supabase.from('peserta').update({ waktu_tampil_detik: detik }).eq('id', id);
    await load();
  }

  if (loading) return <p className="text-slate-600">Memuat...</p>;

  // ─── Mode panel Set Nomor Urut ───
  if (modeSetNomor) {
    return (
      <SetNomorUrutPanel
        peserta={peserta}
        onSelesai={async () => {
          setModeSetNomor(false);
          await load();
        }}
        onBatal={() => setModeSetNomor(false)}
      />
    );
  }

  // ─── Mode tampilan normal ───
  return (
    <div className="space-y-4">
      <form onSubmit={handleAdd} className="rounded-xl border border-slate-200 bg-white p-4">
        <h3 className="mb-1 font-semibold text-slate-900">Tambah Peserta</h3>
        <p className="mb-3 text-xs text-slate-500">
          Tambahkan nama regu dulu. Nomor urut diatur lewat tombol &quot;Set Nomor Urut&quot;.
        </p>
        <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
          <input
            required
            value={namaRegu}
            onChange={(e) => setNamaRegu(e.target.value)}
            placeholder="Nama Regu"
            className="rounded-lg border border-slate-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
          />
          <button
            type="submit"
            disabled={saving}
            className="flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            <Plus className="h-4 w-4" />
            Tambah
          </button>
        </div>
        {pesanError && (
          <div className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
            {pesanError}
          </div>
        )}
      </form>

      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-600">Total {peserta.length} peserta</p>
        <button
          onClick={() => setModeSetNomor(true)}
          disabled={peserta.length === 0}
          className="flex items-center gap-2 rounded-lg bg-slate-800 px-4 py-2 text-sm font-medium text-white hover:bg-slate-900 disabled:opacity-50"
        >
          <ListOrdered className="h-4 w-4" />
          Set Nomor Urut
        </button>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <table className="w-full">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-4 py-2 text-left text-xs font-semibold text-slate-600">No Urut</th>
              <th className="px-4 py-2 text-left text-xs font-semibold text-slate-600">Nama Regu</th>
              <th className="px-4 py-2 text-left text-xs font-semibold text-slate-600">
                Waktu Tampil
              </th>
              <th className="px-4 py-2 text-right text-xs font-semibold text-slate-600">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {peserta.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-sm text-slate-500">
                  Belum ada peserta
                </td>
              </tr>
            ) : (
              peserta.map((p) => (
                <PesertaRow
                  key={p.id}
                  peserta={p}
                  onDelete={() => setHapusTarget(p)}
                  onUpdateWaktu={handleUpdateWaktu}
                />
              ))
            )}
          </tbody>
        </table>
      </div>

      <ConfirmDialog
        open={hapusTarget !== null}
        variant="warning"
        title="Hapus Peserta?"
        message={
          hapusTarget
            ? `Peserta "${hapusTarget.nama_regu}" akan dihapus permanen beserta SEMUA nilai yang sudah masuk. Tindakan ini tidak bisa dibatalkan.`
            : ''
        }
        confirmLabel="Ya, Hapus"
        cancelLabel="Batal"
        loading={menghapus}
        onConfirm={handleDelete}
        onCancel={() => setHapusTarget(null)}
      />
    </div>
  );
}

// ============================================================================
// Panel Set Nomor Urut — atur nomor urut semua peserta sekaligus
// ============================================================================
function SetNomorUrutPanel({
  peserta,
  onSelesai,
  onBatal,
}: {
  peserta: Peserta[];
  onSelesai: () => void;
  onBatal: () => void;
}) {
  // Draft nomor urut per peserta (string supaya bisa dikosongkan)
  const [draft, setDraft] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {};
    peserta.forEach((p) => {
      init[p.id] = p.nomor_urut != null ? String(p.nomor_urut) : '';
    });
    return init;
  });
  const [error, setError] = useState<string | null>(null);
  const [simpan, setSimpan] = useState(false);

  function setNomor(id: string, value: string) {
    setDraft((prev) => ({ ...prev, [id]: value }));
  }

  async function handleSimpan() {
    setError(null);

    // Validasi: nomor urut yang diisi wajib unik (boleh melompat, boleh kosong)
    const terisi = Object.entries(draft)
      .map(([id, val]) => ({ id, nomor: val.trim() }))
      .filter((x) => x.nomor !== '');

    const angka = terisi.map((x) => parseInt(x.nomor));

    // Cek ada angka tidak valid (<= 0)
    if (angka.some((n) => isNaN(n) || n < 1)) {
      setError('Nomor urut harus berupa angka minimal 1.');
      return;
    }

    // Cek duplikat
    const set = new Set(angka);
    if (set.size !== angka.length) {
      const hitung: Record<number, number> = {};
      angka.forEach((n) => (hitung[n] = (hitung[n] || 0) + 1));
      const dobel = Object.entries(hitung)
        .filter(([, c]) => c > 1)
        .map(([n]) => n);
      setError(`Nomor urut tidak boleh sama. Nomor ganda: ${dobel.join(', ')}.`);
      return;
    }

    // Susun payload untuk fungsi database
    const payload = peserta.map((p) => ({
      id: p.id,
      nomor: draft[p.id]?.trim() === '' ? null : parseInt(draft[p.id]),
    }));

    setSimpan(true);
    const supabase = createClient();
    const { error: rpcError } = await supabase.rpc('simpan_nomor_urut_massal', {
      p_data: payload,
    });
    setSimpan(false);

    if (rpcError) {
      setError('Gagal menyimpan: ' + rpcError.message);
      return;
    }

    onSelesai();
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">
        Atur nomor urut semua peserta di sini. Nomor wajib unik (tidak boleh sama), tapi boleh
        melompat dan boleh dikosongkan. Klik &quot;Simpan Semua&quot; bila selesai.
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <table className="w-full">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-4 py-2 text-left text-xs font-semibold text-slate-600">
                Nama Regu
              </th>
              <th className="px-4 py-2 text-left text-xs font-semibold text-slate-600">
                No Urut Sekarang
              </th>
              <th className="px-4 py-2 text-left text-xs font-semibold text-slate-600">
                No Urut Baru
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {peserta.map((p) => (
              <tr key={p.id} className="hover:bg-slate-50">
                <td className="px-4 py-3 text-sm font-medium text-slate-900">{p.nama_regu}</td>
                <td className="px-4 py-3">
                  {p.nomor_urut != null ? (
                    <span className="font-mono text-sm text-slate-500">#{p.nomor_urut}</span>
                  ) : (
                    <span className="text-xs text-slate-400">Belum diatur</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <input
                    type="number"
                    min={1}
                    value={draft[p.id] ?? ''}
                    onChange={(e) => setNomor(p.id, e.target.value)}
                    placeholder="Kosong"
                    className="w-24 rounded-lg border border-slate-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
      )}

      <div className="flex gap-2">
        <button
          onClick={handleSimpan}
          disabled={simpan}
          className="flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
        >
          <Check className="h-4 w-4" />
          {simpan ? 'Menyimpan...' : 'Simpan Semua'}
        </button>
        <button
          onClick={onBatal}
          disabled={simpan}
          className="flex items-center gap-2 rounded-lg border border-slate-300 px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
        >
          <X className="h-4 w-4" />
          Batal
        </button>
      </div>
    </div>
  );
}

// ============================================================================
// Baris peserta di tabel utama — fokus pada set/edit waktu tampil
// ============================================================================
function PesertaRow({
  peserta,
  onDelete,
  onUpdateWaktu,
}: {
  peserta: Peserta;
  onDelete: () => void;
  onUpdateWaktu: (id: string, detik: number | null) => void;
}) {
  const [editWaktu, setEditWaktu] = useState(false);
  const [menit, setMenit] = useState(
    peserta.waktu_tampil_detik ? Math.floor(peserta.waktu_tampil_detik / 60) : 0
  );
  const [detik, setDetik] = useState(
    peserta.waktu_tampil_detik ? peserta.waktu_tampil_detik % 60 : 0
  );

  const sudahAdaWaktu = peserta.waktu_tampil_detik != null;

  function mulaiEdit() {
    setMenit(peserta.waktu_tampil_detik ? Math.floor(peserta.waktu_tampil_detik / 60) : 0);
    setDetik(peserta.waktu_tampil_detik ? peserta.waktu_tampil_detik % 60 : 0);
    setEditWaktu(true);
  }

  function saveWaktu() {
    onUpdateWaktu(peserta.id, menit * 60 + detik);
    setEditWaktu(false);
  }

  return (
    <tr className="hover:bg-slate-50">
      <td className="px-4 py-3">
        {peserta.nomor_urut != null ? (
          <span className="font-mono text-sm font-semibold text-slate-900">
            #{peserta.nomor_urut}
          </span>
        ) : (
          <span className="rounded bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
            Belum diatur
          </span>
        )}
      </td>
      <td className="px-4 py-3 text-sm text-slate-900">{peserta.nama_regu}</td>
      <td className="px-4 py-3">
        {editWaktu ? (
          <div className="flex items-center gap-1">
            <input
              type="number"
              min={0}
              max={99}
              value={menit}
              onChange={(e) => setMenit(parseInt(e.target.value) || 0)}
              className="w-14 rounded border border-slate-300 px-2 py-1 text-sm"
            />
            <span className="text-slate-500">menit</span>
            <input
              type="number"
              min={0}
              max={59}
              value={detik}
              onChange={(e) => setDetik(parseInt(e.target.value) || 0)}
              className="ml-1 w-14 rounded border border-slate-300 px-2 py-1 text-sm"
            />
            <span className="text-slate-500">detik</span>
            <button
              onClick={saveWaktu}
              className="ml-1 rounded bg-blue-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-blue-700"
            >
              Simpan
            </button>
            <button
              onClick={() => setEditWaktu(false)}
              className="rounded border border-slate-300 px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50"
            >
              Batal
            </button>
          </div>
        ) : sudahAdaWaktu ? (
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1 font-mono text-sm font-semibold text-slate-900">
              <Clock className="h-3.5 w-3.5 text-slate-400" />
              {formatWaktu(peserta.waktu_tampil_detik)}
            </span>
            <button
              onClick={mulaiEdit}
              className="rounded bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600 hover:bg-slate-200"
            >
              Edit
            </button>
          </div>
        ) : (
          <button
            onClick={mulaiEdit}
            className="flex items-center gap-1 rounded-lg border border-blue-300 bg-blue-50 px-2.5 py-1 text-sm font-medium text-blue-700 hover:bg-blue-100"
          >
            <Clock className="h-3.5 w-3.5" />
            Set Waktu Tampil
          </button>
        )}
      </td>
      <td className="px-4 py-3 text-right">
        <button
          onClick={onDelete}
          className="rounded-lg p-1.5 text-red-600 hover:bg-red-50"
          aria-label="Hapus"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </td>
    </tr>
  );
}