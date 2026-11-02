'use client';

import { useEffect, useState } from 'react';
import { Plus, Save, Trash2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import {
  getLdwcItems,
  LDWC_COMPONENT_KEYS,
  LDWC_DEFAULT_RUBRIC,
  LDWC_LEVEL_ORDER,
  parseLdwcRubric,
  type LdwcComponent,
  type LdwcRubric,
  type RubricLevel,
} from '@/lib/ldwc-rubric';

const COMPONENT_LABELS: Record<LdwcComponent, string> = {
  pbb: 'Gerakan PBB',
  dantonPbb: 'Danton PBB',
  variasi: 'Variasi',
  formasi: 'Formasi',
  dantonVarfor: 'Danton VarFor',
};

type Props = { eventId: string; scoringTemplate: string };

export default function GerakanPbbTab({ eventId, scoringTemplate }: Props) {
  const [rubric, setRubric] = useState<LdwcRubric>(LDWC_DEFAULT_RUBRIC);
  const [component, setComponent] = useState<LdwcComponent>('pbb');
  const [loading, setLoading] = useState(true);
  const [ready, setReady] = useState(false);
  const [locked, setLocked] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  useEffect(() => {
    void load();
  }, [eventId]);

  async function load() {
    setLoading(true);
    setReady(false);
    setError('');
    const supabase = createClient();
    const [{ data: event, error: eventError }, { data: pbb, error: pbbError }, { data: varfor, error: varforError }] =
      await Promise.all([
        supabase.from('events').select('rubric').eq('id', eventId).single(),
        supabase
          .from('pbb_submissions')
          .select('submitted, pbb_scores, danton_scores')
          .eq('event_id', eventId),
        supabase.from('variasi_submissions').select('submitted, scores').eq('event_id', eventId),
      ]);

    const failed = eventError ?? pbbError ?? varforError;
    if (failed) {
      setError(failed.message);
      setLoading(false);
      return;
    }
    if (!event) {
      setError('Event tidak ditemukan.');
      setLoading(false);
      return;
    }

    try {
      setRubric(parseLdwcRubric(event.rubric ?? LDWC_DEFAULT_RUBRIC));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Pengaturan nilai event tidak valid.');
      setLoading(false);
      return;
    }

    const hasScores = [...(pbb ?? []), ...(varfor ?? [])].some((row) => {
      if (row.submitted) return true;
      return Object.entries(row).some(
        ([key, value]) =>
          (key.endsWith('_scores') || key === 'scores') &&
          Array.isArray(value) &&
          value.length > 0,
      );
    });
    setLocked(hasScores);
    setReady(true);
    setLoading(false);
  }

  function updateItem(
    itemId: number,
    patch: Partial<LdwcRubric['components'][LdwcComponent][number]>,
  ) {
    setRubric((current) => ({
      ...current,
      components: {
        ...current.components,
        [component]: current.components[component].map((item) =>
          item.itemId === itemId ? { ...item, ...patch } : item,
        ),
      },
    }));
    setNotice('');
  }

  function addItem() {
    const allItems = getLdwcItems(rubric);
    const itemId =
      Math.max(
        0,
        ...allItems.pbb.map((item) => item.itemId),
        ...allItems.dantonPbb.map((item) => item.itemId),
        ...allItems.variasi.map((item) => item.itemId),
        ...allItems.formasi.map((item) => item.itemId),
        ...allItems.dantonVarfor.map((item) => item.itemId),
      ) + 1;
    setRubric((current) => ({
      ...current,
      components: {
        ...current.components,
        [component]: [
          ...current.components[component],
          { itemId, name: `Item ${itemId}`, max: 10, levels: { KOSONG: 0, MINIMAL: 2, SB: 10 } },
        ],
      },
    }));
    setNotice('');
  }

  function removeItem(itemId: number) {
    if (rubric.components[component].length === 1) {
      setError('Minimal harus ada satu item pada setiap bagian.');
      return;
    }
    setRubric((current) => ({
      ...current,
      components: {
        ...current.components,
        [component]: current.components[component].filter((item) => item.itemId !== itemId),
      },
    }));
    setError('');
    setNotice('');
  }

  function updateLevel(itemId: number, level: RubricLevel, rawValue: string) {
    const item = rubric.components[component].find((candidate) => candidate.itemId === itemId);
    if (!item) return;
    const levels = { ...item.levels };
    if (rawValue === '') {
      delete levels[level];
    } else {
      const value = Number(rawValue);
      if (!Number.isFinite(value)) return;
      levels[level] = value;
    }
    updateItem(itemId, { levels });
  }

  async function save() {
    setSaving(true);
    setError('');
    setNotice('');
    try {
      const updatedRubric = parseLdwcRubric(rubric);
      const response = await fetch('/api/admin/update-rubric', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventId, rubric: updatedRubric }),
      });
      const result = await response.json();
      if (!response.ok) {
        if (response.status === 409) setLocked(true);
        throw new Error(result.error ?? 'Gagal menyimpan pengaturan nilai.');
      }
      setRubric(updatedRubric);
      setNotice('Perubahan berhasil disimpan.');
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Gagal menyimpan pengaturan nilai.');
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <p className="text-slate-600">Memuat tabel penilaian...</p>;
  if (!ready) return <p role="alert" className="text-red-600">{error || 'Tabel penilaian belum siap.'}</p>;
  if (scoringTemplate !== 'LDWC_2026') {
    return <p className="rounded-lg bg-amber-50 p-4 text-sm text-amber-900">Tabel hanya bisa diedit untuk event LDWC 2026.</p>;
  }

  const items = rubric.components[component];
  const totalMaximum = items.reduce((sum, item) => sum + item.max, 0);

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900">
        Pilih bagian, lalu edit langsung isi tabel. Perubahan hanya berlaku untuk event ini.
        {locked && (
          <p className="mt-1 font-semibold">
            Pengaturan terkunci karena juri sudah mulai menyimpan nilai.
          </p>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        {LDWC_COMPONENT_KEYS.map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => setComponent(key)}
            className={`rounded-lg px-3 py-2 text-sm font-medium ${
              component === key ? 'bg-blue-600 text-white' : 'border border-slate-300 bg-white text-slate-700'
            }`}
          >
            {COMPONENT_LABELS[key]}
          </button>
        ))}
      </div>

      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <header className="flex flex-wrap items-center justify-between gap-3 border-b bg-slate-50 p-4">
          <div>
            <h3 className="font-semibold text-slate-900">{COMPONENT_LABELS[component]}</h3>
            <p className="text-xs text-slate-600">{items.length} item · jumlah maksimum {totalMaximum}</p>
          </div>
          <button
            type="button"
            disabled={locked}
            onClick={addItem}
            className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm disabled:opacity-50"
          >
            <Plus className="h-4 w-4" />
            Tambah baris
          </button>
        </header>

        <div className="overflow-x-auto">
          <table className="min-w-[1100px] w-full text-sm">
            <thead className="bg-white text-xs text-slate-600">
              <tr>
                <th className="sticky left-0 bg-slate-50 px-3 py-2 text-left">No.</th>
                <th className="min-w-64 px-3 py-2 text-left">Gerakan / penilaian</th>
                <th className="w-24 px-3 py-2 text-right">Maks.</th>
                {rubric.levelOrder.map((level) => (
                  <th key={level} className="w-20 px-2 py-2 text-right font-mono">{level}</th>
                ))}
                <th className="w-12 px-2 py-2" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {items.map((item) => (
                <tr key={`${component}-${item.itemId}`}>
                  <td className="sticky left-0 bg-white px-3 py-2">
                    <input
                      type="number"
                      min="1"
                      step="1"
                      value={item.itemId}
                      disabled={locked}
                      aria-label={`Nomor item ${item.itemId}`}
                      onChange={(event) => updateItem(item.itemId, { itemId: Number(event.target.value) })}
                      className="w-14 rounded border border-slate-300 px-2 py-1 text-right disabled:bg-slate-100"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <input
                      value={item.name}
                      disabled={locked}
                      aria-label={`Nama item ${item.itemId}`}
                      onChange={(event) => updateItem(item.itemId, { name: event.target.value })}
                      className="w-full min-w-56 rounded border border-slate-300 px-2 py-1 disabled:bg-slate-100"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <input
                      type="number"
                      min="0.01"
                      step="any"
                      value={item.max}
                      disabled={locked}
                      aria-label={`Nilai maksimum item ${item.itemId}`}
                      onChange={(event) => updateItem(item.itemId, { max: Number(event.target.value) })}
                      className="w-20 rounded border border-slate-300 px-2 py-1 text-right disabled:bg-slate-100"
                    />
                  </td>
                  {rubric.levelOrder.map((level) => (
                    <td key={level} className="px-2 py-2">
                      <input
                        type="number"
                        min="0"
                        max={item.max}
                        step="any"
                        value={item.levels[level] ?? ''}
                        disabled={locked}
                        aria-label={`${level}, item ${item.itemId}`}
                        onChange={(event) => updateLevel(item.itemId, level, event.target.value)}
                        className="w-16 rounded border border-slate-300 px-1.5 py-1 text-right disabled:bg-slate-100"
                      />
                    </td>
                  ))}
                  <td className="px-2 py-2">
                    <button
                      type="button"
                      disabled={locked || items.length === 1}
                      aria-label={`Hapus item ${item.itemId}`}
                      onClick={() => removeItem(item.itemId)}
                      className="rounded p-1.5 text-red-600 hover:bg-red-50 disabled:opacity-40"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      {notice && <p role="status" className="rounded-lg bg-green-50 p-3 text-sm text-green-700">{notice}</p>}
      <button
        type="button"
        onClick={() => void save()}
        disabled={locked || saving}
        className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
      >
        <Save className="h-4 w-4" />
        {saving ? 'Menyimpan...' : 'Simpan perubahan'}
      </button>
    </div>
  );
}
