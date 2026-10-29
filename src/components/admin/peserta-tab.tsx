'use client';

import { useCallback, useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { Peserta } from '@/types';
import { Plus, Save, Trash2 } from 'lucide-react';

type PesertaAdmin = Peserta & { deduction_points: number };

export default function PesertaTab({ eventId }: { eventId: string; batasWaktuDetik?: number }) {
  const [peserta, setPeserta] = useState<PesertaAdmin[]>([]);
  const [loading, setLoading] = useState(true);
  const [namaRegu, setNamaRegu] = useState('');
  const [saving, setSaving] = useState(false);
  const [drafts, setDrafts] = useState<Record<string, { nomor: string; deduction: string }>>({});

  const load = useCallback(async () => {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('participants')
      .select('id, event_id, nama_regu, nomor_urut, vote_count, waktu_tampil_detik')
      .eq('event_id', eventId)
      .order('nomor_urut');

    if (error) {
      alert('Gagal memuat peserta: ' + error.message);
      setLoading(false);
      return;
    }

    const participants = data ?? [];
    const { data: deductions, error: deductionError } = await supabase
      .from('deductions')
      .select('participant_id, points')
      .in('participant_id', participants.map((participant) => participant.id));

    if (deductionError && participants.length > 0) {
      alert('Gagal memuat pengurangan: ' + deductionError.message);
      setLoading(false);
      return;
    }

    const deductionTotals = new Map<string, number>();
    deductions?.forEach(({ participant_id, points }) => {
      deductionTotals.set(participant_id, (deductionTotals.get(participant_id) ?? 0) + Number(points));
    });

    const rows = participants.map((participant) => ({
      ...participant,
      deduction_points: deductionTotals.get(participant.id) ?? 0,
    }));
    setPeserta(rows);
    setDrafts(
      Object.fromEntries(
        rows.map((participant) => [
          participant.id,
          {
            nomor: String(participant.nomor_urut),
            deduction: String(participant.deduction_points),
          },
        ])
      )
    );
    setLoading(false);
  }, [eventId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleAdd(event: React.FormEvent) {
    event.preventDefault();
    const trimmedName = namaRegu.trim();
    if (!trimmedName) return;

    setSaving(true);
    const supabase = createClient();
    const nextNumber = Math.max(0, ...peserta.map((participant) => participant.nomor_urut)) + 1;
    const { error } = await supabase.from('participants').insert({
      event_id: eventId,
      nama_regu: trimmedName,
      nomor_urut: nextNumber,
      vote_count: 0,
    });

    if (error) {
      alert('Gagal menambahkan peserta: ' + error.message);
    } else {
      setNamaRegu('');
      await load();
    }
    setSaving(false);
  }

  async function saveParticipant(participant: PesertaAdmin) {
    const draft = drafts[participant.id];
    const nomor = Number(draft?.nomor);
    const deduction = Number(draft?.deduction);
    if (!Number.isInteger(nomor) || nomor < 1 || !Number.isFinite(deduction) || deduction < 0) {
      alert('Nomor urut harus bilangan bulat positif dan pengurangan tidak boleh negatif.');
      return;
    }

    setSaving(true);
    const supabase = createClient();
    const { error: numberError } = await supabase
      .from('participants')
      .update({ nomor_urut: nomor })
      .eq('id', participant.id);
    if (numberError) {
      alert('Gagal menyimpan nomor urut: ' + numberError.message);
      setSaving(false);
      return;
    }

    const { error: deductionError } = await supabase.rpc('set_participant_deduction', {
      p_participant_id: participant.id,
      p_points: deduction,
    });
    if (deductionError) {
      alert('Nomor urut tersimpan, tetapi pengurangan gagal disimpan: ' + deductionError.message);
      setSaving(false);
      await load();
      return;
    }

    await load();
    setSaving(false);
  }

  async function handleDelete(participant: PesertaAdmin) {
    if (!confirm(`Hapus peserta "${participant.nama_regu}" beserta nilainya?`)) return;
    setSaving(true);
    const supabase = createClient();

    for (const table of ['deductions', 'pbb_submissions', 'variasi_submissions'] as const) {
      const { error } = await supabase.from(table).delete().eq('participant_id', participant.id);
      if (error) {
        alert(`Gagal menghapus data ${table}: ${error.message}`);
        setSaving(false);
        return;
      }
    }

    const { error } = await supabase.from('participants').delete().eq('id', participant.id);
    if (error) alert('Gagal menghapus peserta: ' + error.message);
    else await load();
    setSaving(false);
  }

  if (loading) return <p className="text-slate-600">Memuat peserta...</p>;

  return (
    <div className="space-y-4">
      <form onSubmit={handleAdd} className="flex flex-wrap gap-3 rounded-xl border border-slate-200 bg-white p-4">
        <input
          required
          value={namaRegu}
          onChange={(event) => setNamaRegu(event.target.value)}
          placeholder="Nama regu"
          className="min-w-60 flex-1 rounded-lg border border-slate-300 px-3 py-2"
        />
        <button
          disabled={saving}
          className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          <Plus className="h-4 w-4" />
          Tambah Peserta
        </button>
      </form>

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="w-full">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600">Regu</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600">Nomor urut</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600">Pengurangan (poin)</th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {peserta.map((participant) => (
              <tr key={participant.id}>
                <td className="px-4 py-3 font-medium text-slate-900">{participant.nama_regu}</td>
                <td className="px-4 py-3">
                  <input
                    type="number"
                    min={1}
                    step={1}
                    value={drafts[participant.id]?.nomor ?? ''}
                    onChange={(event) =>
                      setDrafts((previous) => ({
                        ...previous,
                        [participant.id]: {
                          ...previous[participant.id],
                          nomor: event.target.value,
                        },
                      }))
                    }
                    className="w-24 rounded-lg border border-slate-300 px-2 py-1.5"
                  />
                </td>
                <td className="px-4 py-3">
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    value={drafts[participant.id]?.deduction ?? '0'}
                    onChange={(event) =>
                      setDrafts((previous) => ({
                        ...previous,
                        [participant.id]: {
                          ...previous[participant.id],
                          deduction: event.target.value,
                        },
                      }))
                    }
                    className="w-32 rounded-lg border border-slate-300 px-2 py-1.5"
                  />
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="inline-flex gap-2">
                    <button
                      disabled={saving}
                      onClick={() => void saveParticipant(participant)}
                      className="inline-flex items-center gap-1 rounded-lg bg-blue-600 px-3 py-1.5 text-sm text-white disabled:opacity-50"
                    >
                      <Save className="h-3.5 w-3.5" />
                      Simpan
                    </button>
                    <button
                      disabled={saving}
                      onClick={() => void handleDelete(participant)}
                      className="inline-flex items-center gap-1 rounded-lg border border-red-200 px-3 py-1.5 text-sm text-red-700 disabled:opacity-50"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Hapus
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {peserta.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-sm text-slate-500">
                  Belum ada peserta.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-slate-500">
        Penalti waktu tidak tersedia pada skema database saat ini; pengurangan manual dicatat di
        tabel deductions.
      </p>
    </div>
  );
}
