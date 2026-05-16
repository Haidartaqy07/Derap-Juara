'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { IndikatorPbb } from '@/types';
import { LABEL_NILAI } from '@/lib/indikator-varfor';
import { CheckCircle2, Send } from 'lucide-react';
import { cn } from '@/lib/utils';

type Props = {
  penilaianId: string;
  eventId: string;
  isLocked: boolean;
  isSubmitted: boolean;
  onSubmitted: () => void;
};

export default function PenilaianPbbForm({
  penilaianId,
  eventId,
  isLocked,
  isSubmitted,
  onSubmitted,
}: Props) {
  const router = useRouter();
  const [indikator, setIndikator] = useState<IndikatorPbb[]>([]);
  const [nilai, setNilai] = useState<Record<string, number>>({}); // indikator_id -> nilai
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [savingId, setSavingId] = useState<string | null>(null);

  useEffect(() => {
    load();
  }, [eventId, penilaianId]);

  async function load() {
    const supabase = createClient();

    // Load semua indikator PBB untuk event ini
    const { data: ind } = await supabase
      .from('indikator_pbb')
      .select('*')
      .eq('event_id', eventId)
      .order('kategori')
      .order('urutan');

    setIndikator(ind || []);

    // Load nilai yang sudah ada
    const { data: detail } = await supabase
      .from('nilai_detail_pbb')
      .select('*')
      .eq('penilaian_id', penilaianId);

    const map: Record<string, number> = {};
    detail?.forEach((d) => {
      map[d.indikator_id] = d.nilai;
    });
    setNilai(map);
    setLoading(false);
  }

  // Auto-save tiap kali user pilih nilai
  async function handleSelectNilai(indikatorId: string, nilaiBaru: number) {
    if (isLocked) return;

    // Optimistic update
    setNilai((prev) => ({ ...prev, [indikatorId]: nilaiBaru }));
    setSavingId(indikatorId);

    const supabase = createClient();
    const { error } = await supabase
      .from('nilai_detail_pbb')
      .upsert({ penilaian_id: penilaianId, indikator_id: indikatorId, nilai: nilaiBaru });

    if (error) {
      alert('Gagal simpan: ' + error.message);
      // Rollback
      await load();
    }
    setSavingId(null);
  }

  async function handleSubmit() {
    if (isLocked) return;

    // Validasi: minimal semua indikator sudah dinilai? (boleh 0 untuk "Kosong")
    const belumDinilai = indikator.filter((i) => nilai[i.id] === undefined);
    if (belumDinilai.length > 0) {
      if (
        !confirm(
          `Ada ${belumDinilai.length} indikator yang belum dinilai. Submit sekarang akan menganggap nilai 0. Lanjutkan?`
        )
      ) {
        return;
      }
      // Set semua yang belum dinilai jadi 0
      const supabase = createClient();
      const upserts = belumDinilai.map((i) => ({
        penilaian_id: penilaianId,
        indikator_id: i.id,
        nilai: 0,
      }));
      await supabase.from('nilai_detail_pbb').upsert(upserts);
    }

    if (!confirm('Submit nilai? Setelah submit, nilai akan TERKUNCI dan tidak bisa diedit kecuali admin membuka kunci.')) {
      return;
    }

    setSubmitting(true);
    const supabase = createClient();
    const { error } = await supabase
      .from('penilaian_pbb')
      .update({ is_submitted: true, is_locked: true, submitted_at: new Date().toISOString() })
      .eq('id', penilaianId);

    if (error) {
      alert('Gagal submit: ' + error.message);
      setSubmitting(false);
      return;
    }

    onSubmitted();
    setSubmitting(false);
    alert('Nilai berhasil disubmit!');
    router.refresh();
  }

  // Pisahkan PBB & Danton
  const indikatorPbb = useMemo(
    () => indikator.filter((i) => i.kategori === 'pbb'),
    [indikator]
  );
  const indikatorDanton = useMemo(
    () => indikator.filter((i) => i.kategori === 'danton_pbb'),
    [indikator]
  );

  // Total
  const totalPbb = indikatorPbb.reduce((sum, i) => sum + (nilai[i.id] ?? 0), 0);
  const totalDanton = indikatorDanton.reduce((sum, i) => sum + (nilai[i.id] ?? 0), 0);
  const totalKeseluruhan = totalPbb + totalDanton;

  if (loading) return <p className="text-slate-600">Memuat indikator...</p>;

  return (
    <div className="space-y-4 pb-32">
      {/* Bagian PBB */}
      <section className="rounded-xl border border-slate-200 bg-white">
        <header className="border-b border-slate-200 bg-slate-50 px-4 py-2.5">
          <h3 className="font-semibold text-slate-900">Penilaian Gerakan PBB</h3>
          <p className="text-xs text-slate-600">{indikatorPbb.length} indikator</p>
        </header>
        <div className="divide-y divide-slate-200">
          {indikatorPbb.map((ind, idx) => (
            <IndikatorRow
              key={ind.id}
              urutan={idx + 1}
              indikator={ind}
              currentNilai={nilai[ind.id]}
              isLocked={isLocked}
              isSaving={savingId === ind.id}
              onSelect={(n) => handleSelectNilai(ind.id, n)}
            />
          ))}
        </div>
      </section>

      {/* Bagian Danton PBB */}
      <section className="rounded-xl border border-slate-200 bg-white">
        <header className="border-b border-slate-200 bg-slate-50 px-4 py-2.5">
          <h3 className="font-semibold text-slate-900">Penilaian Komandan Pasukan (Danton PBB)</h3>
          <p className="text-xs text-slate-600">{indikatorDanton.length} indikator</p>
        </header>
        <div className="divide-y divide-slate-200">
          {indikatorDanton.map((ind, idx) => (
            <IndikatorRow
              key={ind.id}
              urutan={idx + 1}
              indikator={ind}
              currentNilai={nilai[ind.id]}
              isLocked={isLocked}
              isSaving={savingId === ind.id}
              onSelect={(n) => handleSelectNilai(ind.id, n)}
            />
          ))}
        </div>
      </section>

      {/* Bottom bar dengan total & submit (sticky) */}
      <div className="fixed bottom-0 left-0 right-0 border-t border-slate-200 bg-white shadow-lg">
        <div className="mx-auto max-w-5xl px-4 py-3">
          <div className="flex items-center justify-between gap-3">
            <div className="grid grid-cols-3 gap-3 flex-1">
              <div className="rounded-lg bg-slate-50 px-3 py-1.5">
                <p className="text-xs text-slate-600">Total PBB</p>
                <p className="font-mono text-sm font-bold text-slate-900">{totalPbb}</p>
              </div>
              <div className="rounded-lg bg-slate-50 px-3 py-1.5">
                <p className="text-xs text-slate-600">Total Danton</p>
                <p className="font-mono text-sm font-bold text-slate-900">{totalDanton}</p>
              </div>
              <div className="rounded-lg bg-blue-50 px-3 py-1.5">
                <p className="text-xs text-blue-700">Total Keseluruhan</p>
                <p className="font-mono text-base font-bold text-blue-700">{totalKeseluruhan}</p>
              </div>
            </div>
            {isSubmitted ? (
              <div className="flex items-center gap-2 rounded-lg bg-green-100 px-4 py-2.5 font-medium text-green-700">
                <CheckCircle2 className="h-5 w-5" />
                Submitted
              </div>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={submitting || isLocked}
                className="flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 font-semibold text-white shadow hover:bg-blue-700 disabled:opacity-50"
              >
                <Send className="h-4 w-4" />
                {submitting ? 'Submit...' : 'Submit Nilai'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Helper class names untuk setiap warna indikator
// Outdoor-friendly: kontras tinggi, default berwarna jelas, terpilih solid,
// yang tidak dipilih jadi abu-abu pudar setelah ada selection di baris itu
// ============================================================================
const COLOR_STYLES: Record<
  string,
  { idle: string; selected: string; dim: string }
> = {
  gray: {
    idle: 'border-slate-400 bg-slate-50 text-slate-800',
    selected: 'border-slate-900 bg-slate-800 text-white ring-4 ring-slate-300 shadow-lg scale-105',
    dim: 'border-slate-200 bg-slate-50 text-slate-400',
  },
  red: {
    idle: 'border-red-500 bg-red-50 text-red-800',
    selected: 'border-red-700 bg-red-600 text-white ring-4 ring-red-300 shadow-lg scale-105',
    dim: 'border-slate-200 bg-slate-50 text-slate-400',
  },
  amber: {
    idle: 'border-amber-500 bg-amber-50 text-amber-900',
    selected: 'border-amber-700 bg-amber-500 text-white ring-4 ring-amber-300 shadow-lg scale-105',
    dim: 'border-slate-200 bg-slate-50 text-slate-400',
  },
  blue: {
    idle: 'border-blue-500 bg-blue-50 text-blue-800',
    selected: 'border-blue-700 bg-blue-600 text-white ring-4 ring-blue-300 shadow-lg scale-105',
    dim: 'border-slate-200 bg-slate-50 text-slate-400',
  },
  green: {
    idle: 'border-green-600 bg-green-50 text-green-800',
    selected: 'border-green-700 bg-green-600 text-white ring-4 ring-green-300 shadow-lg scale-105',
    dim: 'border-slate-200 bg-slate-50 text-slate-400',
  },
};

function IndikatorRow({
  urutan,
  indikator,
  currentNilai,
  isLocked,
  isSaving,
  onSelect,
}: {
  urutan: number;
  indikator: IndikatorPbb;
  currentNilai: number | undefined;
  isLocked: boolean;
  isSaving: boolean;
  onSelect: (nilai: number) => void;
}) {
  const opsi = LABEL_NILAI.map((l) => ({
    label: l.label,
    nilai: indikator[l.key as keyof IndikatorPbb] as number,
    color: l.color,
  }));

  const hasSelection = currentNilai !== undefined;

  return (
    <div className="px-4 py-3">
      <div className="mb-2 flex items-start justify-between gap-2">
        <div className="flex-1">
          <p className="text-sm font-medium text-slate-900">
            {urutan}. {indikator.nama_gerakan}
            {indikator.is_gerakan_jalan && (
              <span className="ml-2 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-700">
                Gerakan Jalan
              </span>
            )}
          </p>
          <p className="text-xs text-slate-500">
            Nilai terpilih:{' '}
            <span className="font-mono text-sm font-bold text-slate-900">
              {hasSelection ? currentNilai : '-'}
            </span>
          </p>
        </div>
        {isSaving && (
          <span className="text-xs font-medium text-blue-600">Menyimpan...</span>
        )}
      </div>
      <div className="grid grid-cols-9 gap-1.5">
        {opsi.map((o) => {
          const isSelected = hasSelection && currentNilai === o.nilai;
          const styles = COLOR_STYLES[o.color] ?? COLOR_STYLES.gray;

          // Tentukan state visual:
          // - locked: opacity-50 (sebelum cek selected)
          // - selected: pakai .selected (solid + ring tebal)
          // - hasSelection tapi bukan ini: pakai .dim (abu pudar)
          // - belum ada selection: pakai .idle (warna asli indikator)
          const stateClass = isSelected
            ? styles.selected
            : hasSelection
              ? styles.dim
              : styles.idle;

          return (
            <button
              key={o.label}
              onClick={() => onSelect(o.nilai)}
              disabled={isLocked}
              aria-pressed={isSelected}
              className={cn(
                'flex flex-col items-center rounded-lg border-2 px-1 py-2 text-xs font-semibold transition-all duration-150',
                'active:scale-95',
                isLocked && 'cursor-not-allowed opacity-60',
                stateClass
              )}
            >
              <span className="text-[10px] font-bold uppercase tracking-wide">
                {o.label}
              </span>
              <span className="font-mono text-sm">{o.nilai}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}