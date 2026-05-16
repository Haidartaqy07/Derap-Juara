'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { IndikatorVarfor } from '@/types';
import { INDIKATOR_VARFOR, LABEL_NILAI } from '@/lib/indikator-varfor';
import { CheckCircle2, Send } from 'lucide-react';
import { cn } from '@/lib/utils';
import ConfirmDialog from '@/components/confirm-dialog';

type Props = {
  penilaianId: string;
  eventId: string;
  isLocked: boolean;
  isSubmitted: boolean;
  onSubmitted: () => void;
};

// Tahap dialog: null = tidak ada dialog tampil
type DialogStep =
  | null
  | { type: 'belum-lengkap'; jumlah: number }
  | { type: 'konfirmasi' }
  | { type: 'berhasil' };

export default function PenilaianVarforForm({
  penilaianId,
  eventId,
  isLocked,
  isSubmitted,
  onSubmitted,
}: Props) {
  const router = useRouter();
  const [nilai, setNilai] = useState<Record<string, number>>({}); // kode_indikator -> nilai
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [savingKode, setSavingKode] = useState<string | null>(null);
  const [dialog, setDialog] = useState<DialogStep>(null);

  useEffect(() => {
    load();
  }, [penilaianId]);

  async function load() {
    const supabase = createClient();
    const { data: detail } = await supabase
      .from('nilai_detail_varfor')
      .select('*')
      .eq('penilaian_id', penilaianId);

    const map: Record<string, number> = {};
    detail?.forEach((d) => {
      map[d.kode_indikator] = d.nilai;
    });
    setNilai(map);
    setLoading(false);
  }

  async function handleSelectNilai(kode: string, nilaiBaru: number) {
    if (isLocked) return;

    setNilai((prev) => ({ ...prev, [kode]: nilaiBaru }));
    setSavingKode(kode);

    const supabase = createClient();
    const { error } = await supabase
      .from('nilai_detail_varfor')
      .upsert({ penilaian_id: penilaianId, kode_indikator: kode, nilai: nilaiBaru });

    if (error) {
      alert('Gagal simpan: ' + error.message);
      await load();
    }
    setSavingKode(null);
  }

  // Dipanggil saat juri klik tombol "Submit Nilai"
  function handleClickSubmit() {
    if (isLocked) return;

    const belumDinilai = INDIKATOR_VARFOR.filter((i) => nilai[i.kode] === undefined);
    if (belumDinilai.length > 0) {
      setDialog({ type: 'belum-lengkap', jumlah: belumDinilai.length });
    } else {
      setDialog({ type: 'konfirmasi' });
    }
  }

  // Eksekusi submit final ke database
  async function executeSubmit() {
    setSubmitting(true);
    const supabase = createClient();

    // Isi nilai 0 untuk indikator yang belum dinilai
    const belumDinilai = INDIKATOR_VARFOR.filter((i) => nilai[i.kode] === undefined);
    if (belumDinilai.length > 0) {
      await supabase.from('nilai_detail_varfor').upsert(
        belumDinilai.map((i) => ({
          penilaian_id: penilaianId,
          kode_indikator: i.kode,
          nilai: 0,
        }))
      );
    }

    const { error } = await supabase
      .from('penilaian_varfor')
      .update({ is_submitted: true, is_locked: true, submitted_at: new Date().toISOString() })
      .eq('id', penilaianId);

    setSubmitting(false);

    if (error) {
      setDialog(null);
      alert('Gagal submit: ' + error.message);
      return;
    }

    onSubmitted();
    setDialog({ type: 'berhasil' });
  }

  // Setelah juri klik OK di dialog sukses → kembali ke daftar peserta
  function handleSelesai() {
    setDialog(null);
    router.push(`/juri/events/${eventId}`);
    router.refresh();
  }

  // Group indikator
  const groups = useMemo(() => {
    const result: Record<string, IndikatorVarfor[]> = {};
    INDIKATOR_VARFOR.forEach((ind) => {
      if (!result[ind.group]) result[ind.group] = [];
      result[ind.group].push(ind);
    });
    return result;
  }, []);

  const totalVarfor = INDIKATOR_VARFOR.filter((i) => i.kategori !== 'danton').reduce(
    (sum, i) => sum + (nilai[i.kode] ?? 0),
    0
  );
  const totalDanton = INDIKATOR_VARFOR.filter((i) => i.kategori === 'danton').reduce(
    (sum, i) => sum + (nilai[i.kode] ?? 0),
    0
  );

  if (loading) return <p className="text-slate-600">Memuat indikator...</p>;

  return (
    <div className="space-y-4 pb-32">
      {Object.entries(groups).map(([groupName, items]) => {
        const isDantonGroup = items[0]?.kategori === 'danton';
        return (
          <section key={groupName} className="rounded-xl border border-slate-200 bg-white">
            <header
              className={cn(
                'border-b border-slate-200 px-4 py-2.5',
                isDantonGroup ? 'bg-purple-50' : 'bg-slate-50'
              )}
            >
              <h3 className={cn('font-semibold', isDantonGroup ? 'text-purple-900' : 'text-slate-900')}>
                {groupName}
              </h3>
              <p className="text-xs text-slate-600">{items.length} indikator</p>
            </header>
            <div className="divide-y divide-slate-200">
              {items.map((ind) => (
                <IndikatorVarforRow
                  key={ind.kode}
                  indikator={ind}
                  currentNilai={nilai[ind.kode]}
                  isLocked={isLocked}
                  isSaving={savingKode === ind.kode}
                  onSelect={(n) => handleSelectNilai(ind.kode, n)}
                />
              ))}
            </div>
          </section>
        );
      })}

      {/* Bottom bar sticky */}
      <div className="fixed bottom-0 left-0 right-0 border-t border-slate-200 bg-white shadow-lg">
        <div className="mx-auto max-w-5xl px-4 py-3">
          <div className="flex items-center justify-between gap-3">
            <div className="grid flex-1 grid-cols-3 gap-3">
              <div className="rounded-lg bg-blue-50 px-3 py-1.5">
                <p className="text-xs text-blue-700">Total VarFor</p>
                <p className="font-mono text-sm font-bold text-blue-700">
                  {totalVarfor}{' '}
                  <span className="text-xs font-normal text-blue-600">/ 916</span>
                </p>
              </div>
              <div className="rounded-lg bg-purple-50 px-3 py-1.5">
                <p className="text-xs text-purple-700">Total Danton</p>
                <p className="font-mono text-sm font-bold text-purple-700">
                  {totalDanton} <span className="text-xs font-normal text-purple-600">/ 102</span>
                </p>
              </div>
              <div className="rounded-lg bg-slate-100 px-3 py-1.5">
                <p className="text-xs text-slate-600">Grand Total</p>
                <p className="font-mono text-base font-bold text-slate-900">
                  {totalVarfor + totalDanton}
                </p>
              </div>
            </div>
            {isSubmitted ? (
              <div className="flex items-center gap-2 rounded-lg bg-green-100 px-4 py-2.5 font-medium text-green-700">
                <CheckCircle2 className="h-5 w-5" />
                Submitted
              </div>
            ) : (
              <button
                onClick={handleClickSubmit}
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

      {/* Dialog: ada indikator belum dinilai */}
      <ConfirmDialog
        open={dialog?.type === 'belum-lengkap'}
        variant="warning"
        title="Masih Ada Indikator Kosong"
        message={
          dialog?.type === 'belum-lengkap'
            ? `Ada ${dialog.jumlah} indikator yang belum dinilai. Jika dilanjutkan, indikator tersebut akan dianggap bernilai 0.`
            : ''
        }
        confirmLabel="Lanjut Submit"
        cancelLabel="Periksa Lagi"
        onConfirm={() => setDialog({ type: 'konfirmasi' })}
        onCancel={() => setDialog(null)}
      />

      {/* Dialog: konfirmasi submit final */}
      <ConfirmDialog
        open={dialog?.type === 'konfirmasi'}
        variant="confirm"
        title="Submit Penilaian?"
        message="Setelah disubmit, nilai akan TERKUNCI dan tidak bisa diedit lagi. Hubungi admin jika perlu revisi."
        confirmLabel="Ya, Submit"
        cancelLabel="Batal"
        loading={submitting}
        onConfirm={executeSubmit}
        onCancel={() => setDialog(null)}
      />

      {/* Dialog: berhasil submit */}
      <ConfirmDialog
        open={dialog?.type === 'berhasil'}
        variant="success"
        title="Nilai Berhasil Disubmit"
        message="Penilaian untuk peserta ini sudah tersimpan dan terkunci. Anda akan kembali ke daftar peserta."
        onConfirm={handleSelesai}
      />
    </div>
  );
}

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

function IndikatorVarforRow({
  indikator,
  currentNilai,
  isLocked,
  isSaving,
  onSelect,
}: {
  indikator: IndikatorVarfor;
  currentNilai: number | undefined;
  isLocked: boolean;
  isSaving: boolean;
  onSelect: (nilai: number) => void;
}) {
  const opsi = LABEL_NILAI.map((l) => ({
    label: l.label,
    nilai: indikator[l.key as keyof IndikatorVarfor] as number,
    color: l.color,
  }));

  // Dedupe untuk D1-D3 yang punya banyak nilai sama (3 level efektif)
  const uniqueOpsi: typeof opsi = [];
  const seenNilai = new Set<number>();
  opsi.forEach((o) => {
    if (!seenNilai.has(o.nilai)) {
      uniqueOpsi.push(o);
      seenNilai.add(o.nilai);
    }
  });

  const useCompactGrid = uniqueOpsi.length === opsi.length;
  const hasSelection = currentNilai !== undefined;

  return (
    <div className="px-4 py-3">
      <div className="mb-2 flex items-start justify-between gap-2">
        <div className="flex-1">
          <p className="text-sm font-medium text-slate-900">
            <span className="mr-1 inline-block min-w-[28px] font-mono text-xs text-slate-500">
              {indikator.kode}
            </span>
            {indikator.nama}
          </p>
          <p className="text-xs text-slate-500">
            Nilai terpilih:{' '}
            <span className="font-mono text-sm font-bold text-slate-900">
              {hasSelection ? currentNilai : '-'}
            </span>
          </p>
        </div>
        {isSaving && <span className="text-xs font-medium text-blue-600">Menyimpan...</span>}
      </div>
      <div
        className={cn(
          'grid gap-1.5',
          useCompactGrid ? 'grid-cols-9' : `grid-cols-${Math.min(uniqueOpsi.length, 5)}`
        )}
        style={!useCompactGrid ? { gridTemplateColumns: `repeat(${uniqueOpsi.length}, minmax(0, 1fr))` } : undefined}
      >
        {(useCompactGrid ? opsi : uniqueOpsi).map((o, idx) => {
          const isSelected = hasSelection && currentNilai === o.nilai;
          const styles = COLOR_STYLES[o.color] ?? COLOR_STYLES.gray;

          const stateClass = isSelected
            ? styles.selected
            : hasSelection
              ? styles.dim
              : styles.idle;

          return (
            <button
              key={`${o.label}-${idx}`}
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