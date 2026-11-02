'use client';

import { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Send } from 'lucide-react';
import ConfirmDialog from '@/components/confirm-dialog';
import { createClient } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';
import { rubricLevels, type RubricItem, type RubricLevel } from '@/lib/ldwc-rubric';

export type ScoreField = 'pbb_scores' | 'danton_scores' | 'scores';
type SubmissionTable = 'pbb_submissions' | 'variasi_submissions';

export interface RubricScoreSection {
  title: string;
  field: ScoreField;
  items: RubricItem[];
}

type Props = {
  submissionId: string;
  table: SubmissionTable;
  sections: RubricScoreSection[];
  levelOrder: RubricLevel[];
  isLocked: boolean;
  isSubmitted: boolean;
  isDraftSubmitted: boolean;
  onDraftSubmitted: () => void;
};

type DialogStep = null | { type: 'incomplete'; count: number } | { type: 'confirm' } | { type: 'success' };
type ItemValues = Record<string, number>;
type StoredScore = { itemId?: number; value?: number };

function getProperty(value: unknown, key: string): unknown {
  if (typeof value !== 'object' || value === null) return undefined;
  return Reflect.get(value, key);
}

function itemKey(field: ScoreField, itemId: number) {
  return `${field}:${itemId}`;
}

function parseScores(raw: unknown): StoredScore[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter(
    (score): score is StoredScore =>
      typeof score === 'object' &&
      score !== null &&
      Number.isInteger((score as StoredScore).itemId) &&
      typeof (score as StoredScore).value === 'number'
  );
}

export default function RubricScoreForm({
  submissionId,
  table,
  sections,
  levelOrder,
  isLocked,
  isSubmitted,
  isDraftSubmitted,
  onDraftSubmitted,
}: Props) {
  const [values, setValues] = useState<ItemValues>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [dialog, setDialog] = useState<DialogStep>(null);

  const fields = useMemo(
    () => [...new Set(sections.map((section) => section.field))],
    [sections]
  );

  useEffect(() => {
    void load();
  }, [submissionId, table, fields]);

  async function load() {
    setLoading(true);
    setError('');
    const supabase = createClient();
    const { data, error: loadError } = await supabase
      .from(table)
      .select(fields.join(','))
      .eq('id', submissionId)
      .maybeSingle();

    if (loadError || !data) {
      setError(loadError?.message ?? 'Data penilaian tidak ditemukan.');
      setLoading(false);
      return;
    }

    const nextValues: ItemValues = {};
    for (const section of sections) {
      const byId = new Map(
        parseScores(getProperty(data, section.field)).map((score) => [score.itemId!, score.value!])
      );
      for (const item of section.items) {
        const score = byId.get(item.itemId);
        if (score !== undefined) nextValues[itemKey(section.field, item.itemId)] = score;
      }
    }
    setValues(nextValues);
    setLoading(false);
  }

  function makeFieldScores(field: ScoreField, currentValues: ItemValues, includeMissing: boolean) {
    return sections
      .filter((section) => section.field === field)
      .flatMap((section) =>
        section.items.flatMap((item) => {
          const value = currentValues[itemKey(field, item.itemId)];
          if (value === undefined && !includeMissing) return [];
          return [{ itemId: item.itemId, value: value ?? 0 }];
        })
      );
  }

  async function selectValue(field: ScoreField, item: RubricItem, value: number) {
    if (isLocked || savingKey !== null || submitting) return;
    const key = itemKey(field, item.itemId);
    const nextValues = { ...values, [key]: value };
    setValues(nextValues);
    setSavingKey(key);

    const { error: saveError } = await createClient()
      .from(table)
      .update({ [field]: makeFieldScores(field, nextValues, false) })
      .eq('id', submissionId);

    if (saveError) {
      alert('Gagal menyimpan nilai: ' + saveError.message);
      await load();
    }
    setSavingKey(null);
  }

  async function sendDraft() {
    setSubmitting(true);
    const updates: Record<string, unknown> = { draft_submitted_at: new Date().toISOString() };
    fields.forEach((field) => {
      updates[field] = makeFieldScores(field, values, false);
    });

    const { error: submitError } = await createClient()
      .from(table)
      .update(updates)
      .eq('id', submissionId);

    setSubmitting(false);
    if (submitError) {
      setDialog(null);
      alert('Gagal mengirim draf: ' + submitError.message);
      return;
    }
    onDraftSubmitted();
    setDialog({ type: 'success' });
  }

  const missingCount = sections.reduce(
    (count, section) =>
      count + section.items.filter((item) => values[itemKey(section.field, item.itemId)] === undefined).length,
    0
  );

  if (loading) return <p className="text-slate-600">Memuat rubrik LDWC...</p>;
  if (error) return <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>;

  return (
    <div className="space-y-4 pb-[calc(10rem+env(safe-area-inset-bottom))]">
      {sections.map((section) => {
        const subtotal = section.items.reduce(
          (sum, item) => sum + (values[itemKey(section.field, item.itemId)] ?? 0),
          0
        );
        const maximum = section.items.reduce((sum, item) => sum + item.max, 0);

        return (
          <section key={section.title} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <header className="border-b border-blue-900/10 bg-blue-950 px-4 py-4 text-white sm:px-5">
              <div className="flex items-center justify-between gap-2">
                <h3 className="font-bold text-white">{section.title}</h3>
                <span className="rounded-lg bg-white/10 px-2.5 py-1 font-mono text-sm font-bold text-orange-200">
                  {subtotal} / {maximum}
                </span>
              </div>
              <p className="mt-1 text-xs text-blue-100">{section.items.length} indikator · subtotal mentah</p>
            </header>
            <div className="divide-y divide-slate-200">
              {section.items.map((item) => {
                const key = itemKey(section.field, item.itemId);
                return (
                  <RubricScoreRow
                    key={key}
                    item={item}
                    levelOrder={levelOrder}
                    value={values[key]}
                    locked={isLocked || savingKey !== null || submitting}
                    saving={savingKey === key}
                    onSelect={(value) => void selectValue(section.field, item, value)}
                  />
                );
              })}
            </div>
          </section>
        );
      })}

      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-slate-200 bg-white/95 shadow-[0_-8px_24px_rgba(15,23,42,0.08)] backdrop-blur-md [padding-bottom:env(safe-area-inset-bottom)]">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-6 sm:py-4 lg:px-8">
          <div className="min-w-0 text-xs text-slate-600 sm:text-sm">
            <span className="font-bold text-blue-950">
              {isSubmitted
                ? 'Nilai sudah difinalkan admin'
                : missingCount > 0
                  ? `${missingCount} indikator belum dinilai`
                  : 'Semua indikator telah dinilai'}
            </span>
            <p className="mt-0.5 hidden text-xs text-slate-500 sm:block">Nilai ini subtotal rubrik, bukan nilai akhir lomba.</p>
          </div>
          {isLocked ? (
            <div className="flex min-h-12 shrink-0 items-center gap-2 rounded-xl bg-green-100 px-4 py-2.5 font-semibold text-green-700">
              <CheckCircle2 className="h-5 w-5" />
              Final oleh Admin
            </div>
          ) : (
            <button
              onClick={() =>
                setDialog(missingCount > 0 ? { type: 'incomplete', count: missingCount } : { type: 'confirm' })
              }
              disabled={submitting || isLocked || savingKey !== null}
              className="flex min-h-12 shrink-0 items-center gap-2 rounded-xl bg-orange-500 px-4 py-3 font-bold text-blue-950 shadow-sm transition hover:bg-orange-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-300 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 sm:px-6"
            >
              <Send className="h-4 w-4" />
              {submitting ? 'Mengirim...' : isDraftSubmitted ? 'Perbarui Draf' : 'Kirim Draf ke Admin'}
            </button>
          )}
        </div>
      </div>

      <ConfirmDialog
        open={dialog?.type === 'incomplete'}
        variant="warning"
        title="Draf Belum Lengkap"
        message={
          dialog?.type === 'incomplete'
            ? `Ada ${dialog.count} indikator yang belum dinilai. Draf tetap bisa dikirim sekarang dan dilengkapi nanti.`
            : ''
        }
        confirmLabel="Kirim Draf"
        cancelLabel="Periksa Lagi"
        onConfirm={() => void sendDraft()}
        onCancel={() => setDialog(null)}
      />
      <ConfirmDialog
        open={dialog?.type === 'confirm'}
        variant="confirm"
        title={isDraftSubmitted ? 'Perbarui Draf?' : 'Kirim Draf Penilaian?'}
        message="Draf akan dikirim untuk diperiksa admin. Anda masih bisa memperbaiki nilai sampai admin memfinalkannya."
        confirmLabel={isDraftSubmitted ? 'Perbarui Draf' : 'Kirim Draf'}
        cancelLabel="Batal"
        loading={submitting}
        onConfirm={() => void sendDraft()}
        onCancel={() => setDialog(null)}
      />
      <ConfirmDialog
        open={dialog?.type === 'success'}
        variant="success"
        title="Draf Berhasil Dikirim"
        message="Nilai tersimpan sebagai draf. Anda tetap dapat memperbaikinya sampai admin mengunci dan memfinalkan penilaian."
        confirmLabel="Lanjutkan"
        onConfirm={() => {
          setDialog(null);
        }}
      />
    </div>
  );
}

function RubricScoreRow({
  item,
  levelOrder,
  value,
  locked,
  saving,
  onSelect,
}: {
  item: RubricItem;
  levelOrder: RubricLevel[];
  value: number | undefined;
  locked: boolean;
  saving: boolean;
  onSelect: (value: number) => void;
}) {
  const options = rubricLevels(item, levelOrder);
  return (
    <div className="px-4 py-4 sm:px-5">
      <div className="mb-2 flex items-start justify-between gap-2">
        <div>
          <p className="text-sm font-semibold leading-relaxed text-slate-900 sm:text-base">
            <span className="mr-2 font-mono text-xs text-slate-500">{item.itemId}.</span>
            {item.name}
          </p>
          <p className="mt-1 text-xs text-slate-500 sm:text-sm">
            Maks. {item.max} · nilai terpilih: <strong className="font-mono">{value ?? '—'}</strong>
          </p>
        </div>
        {saving && <span className="text-xs text-blue-600">Menyimpan...</span>}
      </div>
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-9 sm:gap-2.5">
        {options.map(({ level, value: levelValue }, index) => {
          const selected = value === levelValue;
          const palette = [
            'border-slate-400 bg-slate-50 text-slate-800',
            'border-red-500 bg-red-50 text-red-800',
            'border-amber-500 bg-amber-50 text-amber-900',
            'border-blue-500 bg-blue-50 text-blue-800',
            'border-green-600 bg-green-50 text-green-800',
          ][Math.min(4, Math.floor(index * 5 / options.length))];

          return (
            <button
              key={level}
              type="button"
              onClick={() => onSelect(levelValue)}
              disabled={locked}
              aria-pressed={selected}
              className={cn(
                'flex min-h-12 touch-manipulation flex-col items-center justify-center rounded-xl border-2 px-1 py-2 text-xs font-semibold transition sm:min-h-14 sm:text-sm',
                selected ? 'border-orange-500 bg-blue-950 text-orange-200 ring-2 ring-orange-200' : palette,
                value !== undefined && !selected && 'opacity-40',
                locked && 'cursor-not-allowed',
                !locked && 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 focus-visible:ring-offset-1'
              )}
            >
              <span className="text-[10px] font-bold">{level}</span>
              <span className="font-mono">{levelValue}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
