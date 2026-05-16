'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Peserta } from '@/types';
import { Plus, Trash2, Clock } from 'lucide-react';
import { formatWaktu } from '@/lib/scoring';

export default function PesertaTab({ eventId }: { eventId: string }) {
  const [peserta, setPeserta] = useState<Peserta[]>([]);
  const [loading, setLoading] = useState(true);
  const [namaRegu, setNamaRegu] = useState('');
  const [nomorUrut, setNomorUrut] = useState<number>(1);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    load();
  }, [eventId]);

  async function load() {
    const supabase = createClient();
    const { data } = await supabase
      .from('peserta')
      .select('*')
      .eq('event_id', eventId)
      .order('nomor_urut');
    setPeserta(data || []);

    // Auto-set nomor urut berikutnya
    if (data && data.length > 0) {
      setNomorUrut(Math.max(...data.map((p) => p.nomor_urut)) + 1);
    }
    setLoading(false);
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const supabase = createClient();
    const { error } = await supabase.from('peserta').insert({
      event_id: eventId,
      nama_regu: namaRegu,
      nomor_urut: nomorUrut,
    });

    if (error) {
      alert('Gagal: ' + error.message);
    } else {
      setNamaRegu('');
      await load();
    }
    setSaving(false);
  }

  async function handleDelete(id: string) {
    if (!confirm('Hapus peserta ini? Semua nilai akan ikut terhapus.')) return;
    const supabase = createClient();
    await supabase.from('peserta').delete().eq('id', id);
    await load();
  }

  async function handleUpdateWaktu(id: string, detik: number) {
    const supabase = createClient();
    await supabase.from('peserta').update({ waktu_tampil_detik: detik }).eq('id', id);
    await load();
  }

  if (loading) return <p className="text-slate-600">Memuat...</p>;

  return (
    <div className="space-y-4">
      <form onSubmit={handleAdd} className="rounded-xl border border-slate-200 bg-white p-4">
        <h3 className="mb-3 font-semibold text-slate-900">Tambah Peserta</h3>
        <div className="grid gap-3 sm:grid-cols-[1fr_120px_auto]">
          <input
            required
            value={namaRegu}
            onChange={(e) => setNamaRegu(e.target.value)}
            placeholder="Nama Regu"
            className="rounded-lg border border-slate-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
          />
          <input
            required
            type="number"
            min={1}
            value={nomorUrut}
            onChange={(e) => setNomorUrut(parseInt(e.target.value) || 1)}
            placeholder="No Urut"
            className="rounded-lg border border-slate-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
          />
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            <Plus className="h-4 w-4" />
            Tambah
          </button>
        </div>
      </form>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <table className="w-full">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-4 py-2 text-left text-xs font-semibold text-slate-600">No Urut</th>
              <th className="px-4 py-2 text-left text-xs font-semibold text-slate-600">Nama Regu</th>
              <th className="px-4 py-2 text-left text-xs font-semibold text-slate-600">
                Waktu Tampil
              </th>
              <th className="px-4 py-2"></th>
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
                <PesertaRow key={p.id} peserta={p} onDelete={handleDelete} onUpdateWaktu={handleUpdateWaktu} />
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function PesertaRow({
  peserta,
  onDelete,
  onUpdateWaktu,
}: {
  peserta: Peserta;
  onDelete: (id: string) => void;
  onUpdateWaktu: (id: string, detik: number) => void;
}) {
  const [editWaktu, setEditWaktu] = useState(false);
  const [menit, setMenit] = useState(
    peserta.waktu_tampil_detik ? Math.floor(peserta.waktu_tampil_detik / 60) : 0
  );
  const [detik, setDetik] = useState(peserta.waktu_tampil_detik ? peserta.waktu_tampil_detik % 60 : 0);

  function saveWaktu() {
    onUpdateWaktu(peserta.id, menit * 60 + detik);
    setEditWaktu(false);
  }

  return (
    <tr className="hover:bg-slate-50">
      <td className="px-4 py-3 font-mono text-sm font-semibold text-slate-900">
        #{peserta.nomor_urut}
      </td>
      <td className="px-4 py-3 text-sm text-slate-900">{peserta.nama_regu}</td>
      <td className="px-4 py-3">
        {editWaktu ? (
          <div className="flex items-center gap-1">
            <input
              type="number"
              min={0}
              max={59}
              value={menit}
              onChange={(e) => setMenit(parseInt(e.target.value) || 0)}
              className="w-14 rounded border border-slate-300 px-2 py-1 text-sm"
            />
            <span>:</span>
            <input
              type="number"
              min={0}
              max={59}
              value={detik}
              onChange={(e) => setDetik(parseInt(e.target.value) || 0)}
              className="w-14 rounded border border-slate-300 px-2 py-1 text-sm"
            />
            <button
              onClick={saveWaktu}
              className="ml-1 rounded bg-blue-600 px-2 py-1 text-xs text-white hover:bg-blue-700"
            >
              OK
            </button>
          </div>
        ) : (
          <button
            onClick={() => setEditWaktu(true)}
            className="flex items-center gap-1 rounded-lg bg-slate-100 px-2 py-1 text-sm text-slate-700 hover:bg-slate-200"
          >
            <Clock className="h-3.5 w-3.5" />
            {formatWaktu(peserta.waktu_tampil_detik)}
          </button>
        )}
      </td>
      <td className="px-4 py-3 text-right">
        <button
          onClick={() => onDelete(peserta.id)}
          className="rounded p-1.5 text-red-600 hover:bg-red-50"
          aria-label="Hapus"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </td>
    </tr>
  );
}
