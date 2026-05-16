'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { IndikatorPbb } from '@/types';
import {
  Plus,
  Pencil,
  Trash2,
  ArrowUp,
  ArrowDown,
  Save,
  X,
  AlertTriangle,
  Footprints,
} from 'lucide-react';
import { cn } from '@/lib/utils';

type Props = {
  eventId: string;
};

type Kategori = 'pbb' | 'danton_pbb';

const NILAI_COLS: Array<{
  key: keyof IndikatorPbb;
  label: string;
  shortLabel: string;
}> = [
  { key: 'nilai_kosong', label: 'Kosong', shortLabel: '0' },
  { key: 'nilai_minimal', label: 'Min', shortLabel: 'MIN' },
  { key: 'nilai_k1', label: 'K1', shortLabel: 'K1' },
  { key: 'nilai_k2', label: 'K2', shortLabel: 'K2' },
  { key: 'nilai_c1', label: 'C1', shortLabel: 'C1' },
  { key: 'nilai_c2', label: 'C2', shortLabel: 'C2' },
  { key: 'nilai_b1', label: 'B1', shortLabel: 'B1' },
  { key: 'nilai_b2', label: 'B2', shortLabel: 'B2' },
  { key: 'nilai_sb', label: 'SB', shortLabel: 'SB' },
];

export default function GerakanPbbTab({ eventId }: Props) {
  const [indikator, setIndikator] = useState<IndikatorPbb[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeKategori, setActiveKategori] = useState<Kategori>('pbb');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [hasSubmittedNilai, setHasSubmittedNilai] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const supabase = createClient();

    const [{ data: ind }, { data: submitted }] = await Promise.all([
      supabase
        .from('indikator_pbb')
        .select('*')
        .eq('event_id', eventId)
        .order('kategori')
        .order('urutan'),
      supabase
        .from('penilaian_pbb')
        .select('id, peserta!inner(event_id)')
        .eq('peserta.event_id', eventId)
        .eq('is_submitted', true)
        .limit(1),
    ]);

    setIndikator(ind || []);
    setHasSubmittedNilai((submitted?.length ?? 0) > 0);
    setLoading(false);
  }, [eventId]);

  useEffect(() => {
    load();
  }, [load]);

  const indikatorPbb = useMemo(
    () => indikator.filter((i) => i.kategori === 'pbb').sort((a, b) => a.urutan - b.urutan),
    [indikator]
  );
  const indikatorDanton = useMemo(
    () =>
      indikator.filter((i) => i.kategori === 'danton_pbb').sort((a, b) => a.urutan - b.urutan),
    [indikator]
  );

  const currentList = activeKategori === 'pbb' ? indikatorPbb : indikatorDanton;

  // ============================================================================
  // Reorder via RPC (anti-konflik UNIQUE constraint)
  // ============================================================================
  async function reorderTo(newOrder: IndikatorPbb[]) {
    if (busy) return;
    setBusy(true);

    // Optimistic update
    const otherKategori = indikator.filter((i) => i.kategori !== activeKategori);
    const reorderedWithNewUrutan = newOrder.map((i, idx) => ({ ...i, urutan: idx + 1 }));
    setIndikator([...otherKategori, ...reorderedWithNewUrutan]);

    const supabase = createClient();
    const { error } = await supabase.rpc('reorder_indikator_pbb', {
      p_event_id: eventId,
      p_kategori: activeKategori,
      p_ordered_ids: newOrder.map((i) => i.id),
    });

    if (error) {
      alert('Gagal mengurutkan: ' + error.message);
      await load();
    }
    setBusy(false);
  }

  function moveUp(idx: number) {
    if (idx <= 0) return;
    const arr = [...currentList];
    [arr[idx - 1], arr[idx]] = [arr[idx], arr[idx - 1]];
    reorderTo(arr);
  }

  function moveDown(idx: number) {
    if (idx >= currentList.length - 1) return;
    const arr = [...currentList];
    [arr[idx], arr[idx + 1]] = [arr[idx + 1], arr[idx]];
    reorderTo(arr);
  }

  // ============================================================================
  // CRUD
  // ============================================================================
  async function handleDelete(id: string, nama: string) {
    if (!confirm(`Hapus gerakan "${nama}"? Data nilai detail yang terkait juga akan terhapus.`)) {
      return;
    }
    setBusy(true);
    const supabase = createClient();
    const { error } = await supabase.from('indikator_pbb').delete().eq('id', id);
    if (error) {
      alert('Gagal hapus: ' + error.message);
    } else {
      // Re-compact urutan supaya tidak ada gap
      const remaining = currentList.filter((i) => i.id !== id);
      await supabase.rpc('reorder_indikator_pbb', {
        p_event_id: eventId,
        p_kategori: activeKategori,
        p_ordered_ids: remaining.map((i) => i.id),
      });
    }
    await load();
    setBusy(false);
  }

  if (loading) return <p className="text-slate-600">Memuat gerakan...</p>;

  return (
    <div className="space-y-3">
      {/* Warning kalau sudah ada nilai tersubmit */}
      {hasSubmittedNilai && (
        <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
          <div className="text-sm text-amber-900">
            <p className="font-semibold">Sudah ada juri yang submit nilai untuk event ini.</p>
            <p className="text-xs text-amber-800">
              Mengubah urutan, nama, atau nilai indikator akan memengaruhi rekap.
              Disarankan hanya menambah/edit jika benar-benar diperlukan.
            </p>
          </div>
        </div>
      )}

      {/* Sub-tab kategori */}
      <div className="flex gap-1 border-b border-slate-200">
        <SubTabBtn
          active={activeKategori === 'pbb'}
          onClick={() => {
            setActiveKategori('pbb');
            setEditingId(null);
            setShowAddForm(false);
          }}
          label={`Gerakan PBB (${indikatorPbb.length})`}
        />
        <SubTabBtn
          active={activeKategori === 'danton_pbb'}
          onClick={() => {
            setActiveKategori('danton_pbb');
            setEditingId(null);
            setShowAddForm(false);
          }}
          label={`Komandan Pasukan (${indikatorDanton.length})`}
        />
      </div>

      {/* Header dengan tombol tambah */}
      <div className="flex items-center justify-between">
        <p className="text-xs text-slate-600">
          Klik <ArrowUp className="inline h-3 w-3" /> / <ArrowDown className="inline h-3 w-3" /> untuk
          ubah urutan. Klik <Pencil className="inline h-3 w-3" /> untuk edit nilai.
        </p>
        <button
          onClick={() => {
            setShowAddForm((s) => !s);
            setEditingId(null);
          }}
          className="flex items-center gap-1 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700"
        >
          <Plus className="h-3.5 w-3.5" />
          Tambah Gerakan
        </button>
      </div>

      {/* Form tambah */}
      {showAddForm && (
        <IndikatorForm
          eventId={eventId}
          kategori={activeKategori}
          nextUrutan={currentList.length + 1}
          onClose={() => setShowAddForm(false)}
          onSaved={async () => {
            setShowAddForm(false);
            await load();
          }}
        />
      )}

      {/* Daftar indikator */}
      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-xs text-slate-600">
            <tr>
              <th className="w-12 px-2 py-2 text-center">#</th>
              <th className="px-2 py-2 text-left">Nama Gerakan</th>
              {activeKategori === 'pbb' && (
                <th className="w-20 px-2 py-2 text-center">Jalan?</th>
              )}
              {NILAI_COLS.map((c) => (
                <th key={c.key} className="w-12 px-1 py-2 text-center font-mono">
                  {c.shortLabel}
                </th>
              ))}
              <th className="w-28 px-2 py-2 text-center">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {currentList.length === 0 && (
              <tr>
                <td
                  colSpan={NILAI_COLS.length + (activeKategori === 'pbb' ? 4 : 3)}
                  className="px-3 py-6 text-center text-sm text-slate-500"
                >
                  Belum ada indikator. Klik "Tambah Gerakan" untuk menambahkan.
                </td>
              </tr>
            )}
            {currentList.map((ind, idx) =>
              editingId === ind.id ? (
                <tr key={ind.id} className="bg-blue-50">
                  <td colSpan={NILAI_COLS.length + (activeKategori === 'pbb' ? 4 : 3)} className="px-2 py-2">
                    <IndikatorForm
                      eventId={eventId}
                      kategori={activeKategori}
                      existing={ind}
                      onClose={() => setEditingId(null)}
                      onSaved={async () => {
                        setEditingId(null);
                        await load();
                      }}
                    />
                  </td>
                </tr>
              ) : (
                <tr key={ind.id} className="hover:bg-slate-50">
                  <td className="px-2 py-2 text-center">
                    <div className="flex flex-col items-center gap-0.5">
                      <button
                        disabled={idx === 0 || busy}
                        onClick={() => moveUp(idx)}
                        title="Naik"
                        className="rounded p-0.5 text-slate-500 hover:bg-slate-200 hover:text-slate-900 disabled:opacity-30"
                      >
                        <ArrowUp className="h-3.5 w-3.5" />
                      </button>
                      <span className="font-mono text-xs font-bold text-slate-700">{ind.urutan}</span>
                      <button
                        disabled={idx === currentList.length - 1 || busy}
                        onClick={() => moveDown(idx)}
                        title="Turun"
                        className="rounded p-0.5 text-slate-500 hover:bg-slate-200 hover:text-slate-900 disabled:opacity-30"
                      >
                        <ArrowDown className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </td>
                  <td className="px-2 py-2 font-medium text-slate-900">{ind.nama_gerakan}</td>
                  {activeKategori === 'pbb' && (
                    <td className="px-2 py-2 text-center">
                      {ind.is_gerakan_jalan ? (
                        <Footprints
                          className="mx-auto h-4 w-4 text-amber-600"
                          aria-label="Gerakan Jalan"
                        />
                      ) : (
                        <span className="text-slate-300">—</span>
                      )}
                    </td>
                  )}
                  {NILAI_COLS.map((c) => (
                    <td key={c.key} className="px-1 py-2 text-center font-mono text-xs text-slate-700">
                      {ind[c.key] as number}
                    </td>
                  ))}
                  <td className="px-2 py-2">
                    <div className="flex items-center justify-center gap-1">
                      <button
                        onClick={() => {
                          setEditingId(ind.id);
                          setShowAddForm(false);
                        }}
                        title="Edit"
                        className="rounded p-1 text-blue-600 hover:bg-blue-100"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(ind.id, ind.nama_gerakan)}
                        disabled={busy}
                        title="Hapus"
                        className="rounded p-1 text-red-600 hover:bg-red-100 disabled:opacity-50"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              )
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ============================================================================
// SubTabBtn
// ============================================================================
function SubTabBtn({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'whitespace-nowrap border-b-2 px-3 py-1.5 text-sm font-medium transition',
        active
          ? 'border-blue-600 text-blue-600'
          : 'border-transparent text-slate-600 hover:text-slate-900'
      )}
    >
      {label}
    </button>
  );
}

// ============================================================================
// Form Tambah / Edit Indikator
// ============================================================================
type FormState = {
  nama_gerakan: string;
  is_gerakan_jalan: boolean;
  nilai_kosong: number;
  nilai_minimal: number;
  nilai_k1: number;
  nilai_k2: number;
  nilai_c1: number;
  nilai_c2: number;
  nilai_b1: number;
  nilai_b2: number;
  nilai_sb: number;
};

function IndikatorForm({
  eventId,
  kategori,
  existing,
  nextUrutan,
  onClose,
  onSaved,
}: {
  eventId: string;
  kategori: Kategori;
  existing?: IndikatorPbb;
  nextUrutan?: number;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [state, setState] = useState<FormState>({
    nama_gerakan: existing?.nama_gerakan ?? '',
    is_gerakan_jalan: existing?.is_gerakan_jalan ?? false,
    nilai_kosong: existing?.nilai_kosong ?? 0,
    nilai_minimal: existing?.nilai_minimal ?? 0,
    nilai_k1: existing?.nilai_k1 ?? 0,
    nilai_k2: existing?.nilai_k2 ?? 0,
    nilai_c1: existing?.nilai_c1 ?? 0,
    nilai_c2: existing?.nilai_c2 ?? 0,
    nilai_b1: existing?.nilai_b1 ?? 0,
    nilai_b2: existing?.nilai_b2 ?? 0,
    nilai_sb: existing?.nilai_sb ?? 0,
  });
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (!state.nama_gerakan.trim()) {
      alert('Nama gerakan tidak boleh kosong');
      return;
    }

    setSaving(true);
    const supabase = createClient();

    if (existing) {
      const { error } = await supabase
        .from('indikator_pbb')
        .update({
          nama_gerakan: state.nama_gerakan.trim(),
          is_gerakan_jalan: kategori === 'pbb' ? state.is_gerakan_jalan : false,
          nilai_kosong: state.nilai_kosong,
          nilai_minimal: state.nilai_minimal,
          nilai_k1: state.nilai_k1,
          nilai_k2: state.nilai_k2,
          nilai_c1: state.nilai_c1,
          nilai_c2: state.nilai_c2,
          nilai_b1: state.nilai_b1,
          nilai_b2: state.nilai_b2,
          nilai_sb: state.nilai_sb,
        })
        .eq('id', existing.id);

      if (error) {
        alert('Gagal simpan: ' + error.message);
        setSaving(false);
        return;
      }
    } else {
      const { error } = await supabase.from('indikator_pbb').insert({
        event_id: eventId,
        kategori,
        urutan: nextUrutan ?? 1,
        nama_gerakan: state.nama_gerakan.trim(),
        is_gerakan_jalan: kategori === 'pbb' ? state.is_gerakan_jalan : false,
        nilai_kosong: state.nilai_kosong,
        nilai_minimal: state.nilai_minimal,
        nilai_k1: state.nilai_k1,
        nilai_k2: state.nilai_k2,
        nilai_c1: state.nilai_c1,
        nilai_c2: state.nilai_c2,
        nilai_b1: state.nilai_b1,
        nilai_b2: state.nilai_b2,
        nilai_sb: state.nilai_sb,
      });

      if (error) {
        alert('Gagal tambah: ' + error.message);
        setSaving(false);
        return;
      }
    }

    setSaving(false);
    onSaved();
  }

  return (
    <div className="space-y-3 rounded-lg border border-blue-200 bg-blue-50/40 p-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-slate-900">
          {existing ? 'Edit Gerakan' : 'Tambah Gerakan Baru'}
        </h4>
        <button
          onClick={onClose}
          className="rounded p-1 text-slate-500 hover:bg-slate-200"
          title="Batal"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="grid gap-3 sm:grid-cols-[2fr,auto]">
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-700">
            Nama Gerakan
          </label>
          <input
            type="text"
            value={state.nama_gerakan}
            onChange={(e) => setState((s) => ({ ...s, nama_gerakan: e.target.value }))}
            placeholder="Contoh: Lencang Kanan"
            className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>

        {kategori === 'pbb' && (
          <label className="flex items-end gap-2 pb-1">
            <input
              type="checkbox"
              checked={state.is_gerakan_jalan}
              onChange={(e) =>
                setState((s) => ({ ...s, is_gerakan_jalan: e.target.checked }))
              }
              className="h-4 w-4 rounded border-slate-300"
            />
            <span className="text-xs font-medium text-slate-700">Gerakan Jalan</span>
          </label>
        )}
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium text-slate-700">
          Skala Nilai (Kosong → Sangat Baik)
        </label>
        <div className="grid grid-cols-9 gap-1.5">
          {NILAI_COLS.map((c) => (
            <div key={c.key}>
              <p className="mb-0.5 text-center text-[10px] font-bold uppercase text-slate-500">
                {c.shortLabel}
              </p>
              <input
                type="number"
                value={state[c.key as keyof FormState] as number}
                onChange={(e) =>
                  setState((s) => ({
                    ...s,
                    [c.key]: parseInt(e.target.value, 10) || 0,
                  }))
                }
                className="w-full rounded-md border border-slate-300 px-1.5 py-1 text-center font-mono text-xs focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          ))}
        </div>
      </div>

      <div className="flex justify-end gap-2">
        <button
          onClick={onClose}
          disabled={saving}
          className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100 disabled:opacity-50"
        >
          Batal
        </button>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-1 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
        >
          <Save className="h-3.5 w-3.5" />
          {saving ? 'Menyimpan...' : 'Simpan'}
        </button>
      </div>
    </div>
  );
}