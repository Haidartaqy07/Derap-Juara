'use client';

import { useCallback, useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import {
  getLdwcItems,
  getLdwcMaximums,
  LDWC_DEFAULT_RUBRIC,
  parseLdwcRubric,
  type LdwcRubric,
} from '@/lib/ldwc-rubric';
import {
  computeRaw,
  computeRawFromSharedScores,
  isConfigured,
  LDWC_2026_CONFIG,
  type SubmissionScore,
} from '@/lib/scoring';
import type { EventScoringTemplate, ParticipantCategory } from '@/types';
import { ArrowDownToLine, CheckCircle2, Circle, FileText, RefreshCw, X } from 'lucide-react';
import type { RubricItem } from '@/lib/ldwc-rubric';

type Submission = {
  participant_id: string;
  juri_role: string;
  submitted: boolean;
  pbb_scores?: unknown;
  danton_scores?: unknown;
  scores?: unknown;
};

type ParticipantResult = {
  id: string;
  nama_regu: string;
  nomor_urut: number;
  category: ParticipantCategory;
  vote_count: number;
  submitted: Record<'juri1' | 'juri2' | 'juri3', boolean>;
  scores: {
    pbb1: number | null;
    pbb2: number | null;
    dantonPbb1: number | null;
    dantonPbb2: number | null;
    variasi: number | null;
    formasi: number | null;
    dantonVarfor: number | null;
  };
  scoreEntries: {
    pbb1: SubmissionScore[];
    pbb2: SubmissionScore[];
    dantonPbb1: SubmissionScore[];
    dantonPbb2: SubmissionScore[];
    varfor: SubmissionScore[];
  };
  deduction: number;
};

function scoresFrom(value: unknown): SubmissionScore[] {
  if (!Array.isArray(value)) return [];
  return value.filter(
    (score): score is SubmissionScore =>
      typeof score === 'object' &&
      score !== null &&
      Number.isInteger((score as SubmissionScore).itemId) &&
      typeof (score as SubmissionScore).value === 'number'
  );
}

function displayScore(value: number | null, maximum: number, enabled: boolean) {
  return !enabled || value === null ? '—' : `${Number(value.toFixed(2))} / ${maximum}`;
}

export default function PeringkatTab({ eventId }: { eventId: string; batasWaktuDetik?: number }) {
  const [results, setResults] = useState<ParticipantResult[]>([]);
  const [template, setTemplate] = useState<EventScoringTemplate | null>(null);
  const [rubric, setRubric] = useState<LdwcRubric>(LDWC_DEFAULT_RUBRIC);
  const [eventName, setEventName] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showPdfExport, setShowPdfExport] = useState(false);
  const [pdfScope, setPdfScope] = useState<'all' | 'participant'>('all');
  const [selectedParticipantId, setSelectedParticipantId] = useState('');
  const [exportingPdf, setExportingPdf] = useState(false);
  const [pdfError, setPdfError] = useState('');

  const loadResults = useCallback(async () => {
    setError('');
    const supabase = createClient();
    const [
      { data: event, error: eventError },
      { data: participants, error: participantsError },
    ] = await Promise.all([
      supabase.from('events').select('name, date, scoring_template, rubric').eq('id', eventId).single(),
      supabase
        .from('participants')
        .select('id, nama_regu, nomor_urut, category, vote_count')
        .eq('event_id', eventId)
        .order('nomor_urut'),
    ]);

    if (eventError || participantsError) {
      setError(eventError?.message ?? participantsError?.message ?? 'Gagal memuat event.');
      setLoading(false);
      return;
    }

    setTemplate(event.scoring_template);
    setEventName(event.name);
    setEventDate(event.date);
    let eventRubric: LdwcRubric;
    try {
      eventRubric = parseLdwcRubric(event.rubric ?? LDWC_DEFAULT_RUBRIC);
      setRubric(eventRubric);
    } catch (rubricError) {
      setError(rubricError instanceof Error ? rubricError.message : 'Rubrik event tidak valid.');
      setLoading(false);
      return;
    }
    if (participants.length === 0) {
      setResults([]);
      setLastUpdate(new Date());
      setLoading(false);
      return;
    }

    const participantIds = participants.map(({ id }) => id);
    const [
      { data: pbb, error: pbbError },
      { data: variasi, error: variasiError },
      { data: deductions, error: deductionsError },
    ] = await Promise.all([
      supabase
        .from('pbb_submissions')
        .select('participant_id, juri_role, submitted, pbb_scores, danton_scores')
        .in('participant_id', participantIds),
      supabase
        .from('variasi_submissions')
        .select('participant_id, juri_role, submitted, scores')
        .in('participant_id', participantIds),
      supabase.from('deductions').select('participant_id, points').in('participant_id', participantIds),
    ]);
    const failed = [pbbError, variasiError, deductionsError].find(Boolean);
    if (failed) {
      setError(failed.message);
      setLoading(false);
      return;
    }

    const getSubmission = (rows: Submission[], participantId: string, role: string) =>
      rows.find((row) => row.participant_id === participantId && row.juri_role === role);
    const deductionTotals = new Map<string, number>();
    deductions?.forEach(({ participant_id, points }) =>
      deductionTotals.set(
        participant_id,
        (deductionTotals.get(participant_id) ?? 0) + Number(points)
      )
    );

    const resultRows = participants.map((participant) => {
      const j1 = getSubmission(pbb as Submission[], participant.id, 'juri1');
      const j2 = getSubmission(pbb as Submission[], participant.id, 'juri2');
      const j3 = getSubmission(variasi as Submission[], participant.id, 'juri3');
      const rubricItems = getLdwcItems(eventRubric);
      const pbb1 = computeRaw(
        rubricItems.pbb,
        scoresFrom(j1?.pbb_scores),
        j1?.submitted === true
      );
      const pbb2 = computeRaw(
        rubricItems.pbb,
        scoresFrom(j2?.pbb_scores),
        j2?.submitted === true
      );
      const dantonPbb1 = computeRaw(
        rubricItems.dantonPbb,
        scoresFrom(j1?.danton_scores),
        j1?.submitted === true
      );
      const dantonPbb2 = computeRaw(
        rubricItems.dantonPbb,
        scoresFrom(j2?.danton_scores),
        j2?.submitted === true
      );
      const pbb1Scores = scoresFrom(j1?.pbb_scores);
      const pbb2Scores = scoresFrom(j2?.pbb_scores);
      const dantonPbb1Scores = scoresFrom(j1?.danton_scores);
      const dantonPbb2Scores = scoresFrom(j2?.danton_scores);
      const varforScores = scoresFrom(j3?.scores);

      return {
        id: participant.id,
        nama_regu: participant.nama_regu,
        nomor_urut: participant.nomor_urut,
        category: participant.category,
        vote_count: participant.vote_count,
        submitted: {
          juri1: j1?.submitted === true,
          juri2: j2?.submitted === true,
          juri3: j3?.submitted === true,
        },
        scores: {
          pbb1,
          pbb2,
          dantonPbb1,
          dantonPbb2,
          variasi: computeRawFromSharedScores(
            rubricItems.variasi,
            varforScores,
            j3?.submitted === true
          ),
          formasi: computeRawFromSharedScores(
            rubricItems.formasi,
            varforScores,
            j3?.submitted === true
          ),
          dantonVarfor: computeRawFromSharedScores(
            rubricItems.dantonVarfor,
            varforScores,
            j3?.submitted === true
          ),
        },
        scoreEntries: {
          pbb1: pbb1Scores,
          pbb2: pbb2Scores,
          dantonPbb1: dantonPbb1Scores,
          dantonPbb2: dantonPbb2Scores,
          varfor: varforScores,
        },
        deduction: deductionTotals.get(participant.id) ?? 0,
      };
    });

    setResults(resultRows);
    setLastUpdate(new Date());
    setLoading(false);
  }, [eventId]);

  useEffect(() => {
    void loadResults();
    const supabase = createClient();
    const channel = supabase
      .channel(`ldwc-results-${eventId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pbb_submissions' }, loadResults)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'variasi_submissions' }, loadResults)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'events', filter: `id=eq.${eventId}` },
        loadResults,
      )
      .on('postgres_changes', { event: '*', schema: 'public', table: 'deductions' }, loadResults)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'participants' }, loadResults)
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [eventId, loadResults]);

  const configured = isConfigured(LDWC_2026_CONFIG);
  const isLdwc = template === 'LDWC_2026';
  const maximums = getLdwcMaximums(rubric);

  async function exportScoresPdf() {
    if (!isLdwc) return;
    const selectedParticipant = results.find(({ id }) => id === selectedParticipantId);
    if (pdfScope === 'participant' && !selectedParticipant) return;

    setExportingPdf(true);
    setPdfError('');
    try {
      const [{ jsPDF }, { default: autoTable }] = await Promise.all([
        import('jspdf'),
        import('jspdf-autotable'),
      ]);
      const doc = new jsPDF({
        orientation: pdfScope === 'all' ? 'landscape' : 'portrait',
        unit: 'mm',
        format: 'a4',
      });
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 12;

      const addFooter = () => {
        const pageCount = doc.getNumberOfPages();
        for (let page = 1; page <= pageCount; page += 1) {
          doc.setPage(page);
          doc.setFontSize(8);
          doc.setTextColor(100, 116, 139);
          doc.text(
            `Derap Juara · ${eventName} · Halaman ${page}/${pageCount}`,
            pageWidth - margin,
            pageHeight - 6,
            { align: 'right' }
          );
        }
      };

      doc.setTextColor(23, 37, 84);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(17);
      doc.text('Laporan Nilai LDWC 2026', margin, 17);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.text(eventName, margin, 23);
      doc.text(
        `Tanggal event: ${eventDate ? new Date(`${eventDate}T00:00:00`).toLocaleDateString('id-ID') : '-'}`,
        margin,
        29
      );
      doc.setFontSize(8);
      doc.setTextColor(100, 116, 139);
      doc.text(
        'Subtotal hanya ditampilkan setelah penilaian dikirim. Rincian per regu juga dapat memuat skor draf.',
        margin,
        34
      );

      if (pdfScope === 'all') {
        autoTable(doc, {
          startY: 39,
          margin: { left: margin, right: margin, bottom: 12 },
          head: [[
            'No. / Regu',
            'Kategori',
            'Status juri',
            'PBB J1',
            'PBB J2',
            'Danton PBB J1',
            'Danton PBB J2',
            'Variasi',
            'Formasi',
            'Danton V/F',
            'Pengurangan',
            'Voting',
          ]],
          body: results.map((participant) => [
            `${participant.nomor_urut}. ${participant.nama_regu}`,
            participant.category,
            (['juri1', 'juri2', 'juri3'] as const)
              .map((role, index) => `J${index + 1}: ${participant.submitted[role] ? 'Final' : 'Belum final'}`)
              .join(' · '),
            displayScore(participant.scores.pbb1, maximums.pbb, true),
            displayScore(participant.scores.pbb2, maximums.pbb, true),
            displayScore(participant.scores.dantonPbb1, maximums.dantonPbb, true),
            displayScore(participant.scores.dantonPbb2, maximums.dantonPbb, true),
            displayScore(participant.scores.variasi, maximums.variasi, true),
            displayScore(participant.scores.formasi, maximums.formasi, true),
            displayScore(participant.scores.dantonVarfor, maximums.dantonVarfor, true),
            participant.deduction ? String(participant.deduction) : '-',
            participant.vote_count ? String(participant.vote_count) : '-',
          ]),
          styles: { fontSize: 7, cellPadding: 2, overflow: 'linebreak' },
          headStyles: { fillColor: [23, 37, 84], textColor: [255, 255, 255] },
          alternateRowStyles: { fillColor: [247, 248, 252] },
          columnStyles: { 0: { cellWidth: 29 }, 1: { cellWidth: 17 }, 2: { cellWidth: 35 } },
          didDrawPage: () => {
            doc.setFontSize(8);
            doc.setTextColor(100, 116, 139);
            doc.text(
              'Pengurangan dan voting ditampilkan terpisah dari subtotal rubrik.',
              margin,
              pageHeight - 6
            );
          },
        });
      } else if (selectedParticipant) {
        const participant = selectedParticipant;
        const items = getLdwcItems(rubric);
        const savedValues = (scores: SubmissionScore[]) =>
          new Map(scores.map(({ itemId, value }) => [itemId, value]));
        const scoreLabel = (item: RubricItem, value: number | undefined) => {
          if (value === undefined) return '-';
          const level = rubric.levelOrder.find((key) => item.levels[key] === value);
          return level ? `${value} (${level})` : String(value);
        };
        let nextY = 49;

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(12);
        doc.setTextColor(23, 37, 84);
        doc.text(
          `Regu #${participant.nomor_urut} · ${participant.nama_regu} · ${participant.category}`,
          margin,
          42
        );
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        doc.setTextColor(71, 85, 105);
        doc.text(
          `Status: J1 ${participant.submitted.juri1 ? 'final' : 'belum final'} · J2 ${participant.submitted.juri2 ? 'final' : 'belum final'} · J3 ${participant.submitted.juri3 ? 'final' : 'belum final'}`,
          margin,
          47
        );

        const scoreTable = (
          title: string,
          rubricItems: RubricItem[],
          firstScores: SubmissionScore[],
          firstTotal: number | null,
          firstFinal: boolean,
          firstHeader: string,
          secondScores?: SubmissionScore[],
          secondTotal?: number | null,
          secondFinal?: boolean,
          secondHeader?: string
        ) => {
          if (nextY > pageHeight - 20) {
            doc.addPage();
            nextY = margin;
          }
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(10);
          doc.setTextColor(23, 37, 84);
          doc.text(title, margin, nextY + 3);
          nextY += 5;

          const firstValues = savedValues(firstScores);
          const secondValues = secondScores ? savedValues(secondScores) : undefined;
          autoTable(doc, {
            startY: nextY,
            margin: { left: margin, right: margin, bottom: 12 },
            head: [[
              'Item',
              'Indikator',
              'Maks.',
              firstHeader,
              ...(secondValues ? [secondHeader ?? 'Juri 2'] : []),
            ]],
            body: rubricItems.map((item) => [
              String(item.itemId),
              item.name,
              String(item.max),
              scoreLabel(item, firstValues.get(item.itemId)),
              ...(secondValues ? [scoreLabel(item, secondValues.get(item.itemId))] : []),
            ]),
            foot: [[
              '',
              `Subtotal ${title}`,
              String(rubricItems.reduce((sum, item) => sum + item.max, 0)),
              displayScore(firstTotal, rubricItems.reduce((sum, item) => sum + item.max, 0), firstFinal),
              ...(secondValues
                ? [
                    displayScore(
                      secondTotal ?? null,
                      rubricItems.reduce((sum, item) => sum + item.max, 0),
                      secondFinal === true
                    ),
                  ]
                : []),
            ]],
            styles: { fontSize: 8, cellPadding: 2.2 },
            headStyles: { fillColor: [23, 37, 84], textColor: [255, 255, 255] },
            footStyles: { fillColor: [241, 245, 249], textColor: [23, 37, 84], fontStyle: 'bold' },
            alternateRowStyles: { fillColor: [247, 248, 252] },
            columnStyles: { 0: { cellWidth: 13 }, 2: { cellWidth: 17 } },
          });
          const tableDoc = doc as typeof doc & { lastAutoTable?: { finalY: number } };
          nextY = (tableDoc.lastAutoTable?.finalY ?? nextY) + 8;
        };

        scoreTable(
          'PBB',
          items.pbb,
          participant.scoreEntries.pbb1,
          participant.scores.pbb1,
          participant.submitted.juri1,
          'Juri 1',
          participant.scoreEntries.pbb2,
          participant.scores.pbb2,
          participant.submitted.juri2,
          'Juri 2'
        );
        scoreTable(
          'Danton PBB',
          items.dantonPbb,
          participant.scoreEntries.dantonPbb1,
          participant.scores.dantonPbb1,
          participant.submitted.juri1,
          'Juri 1',
          participant.scoreEntries.dantonPbb2,
          participant.scores.dantonPbb2,
          participant.submitted.juri2,
          'Juri 2'
        );
        scoreTable(
          'Variasi',
          items.variasi,
          participant.scoreEntries.varfor,
          participant.scores.variasi,
          participant.submitted.juri3,
          'Juri 3'
        );
        scoreTable(
          'Formasi',
          items.formasi,
          participant.scoreEntries.varfor,
          participant.scores.formasi,
          participant.submitted.juri3,
          'Juri 3'
        );
        scoreTable(
          'Danton Variasi/Formasi',
          items.dantonVarfor,
          participant.scoreEntries.varfor,
          participant.scores.dantonVarfor,
          participant.submitted.juri3,
          'Juri 3'
        );
        autoTable(doc, {
          startY: nextY,
          margin: { left: margin, right: margin, bottom: 12 },
          head: [['Data tambahan', 'Nilai']],
          body: [
            ['Pengurangan (terpisah dari subtotal)', participant.deduction ? String(participant.deduction) : '-'],
            ['Voting (terpisah dari subtotal)', participant.vote_count ? String(participant.vote_count) : '-'],
          ],
          styles: { fontSize: 8, cellPadding: 2.2 },
          headStyles: { fillColor: [23, 37, 84], textColor: [255, 255, 255] },
        });
      }

      addFooter();
      const fileSuffix = pdfScope === 'all'
        ? 'semua-regu'
        : `${selectedParticipant?.nomor_urut}-${selectedParticipant?.nama_regu ?? 'regu'}`;
      const safeName = `${eventName}-nilai-${fileSuffix}`
        .normalize('NFKD')
        .replace(/[\\/:*?"<>|]+/g, '-')
        .replace(/\s+/g, '-');
      doc.save(`${safeName}.pdf`);
      setShowPdfExport(false);
    } catch (exportError) {
      console.error('[admin/peringkat] gagal membuat PDF:', exportError);
      setPdfError('Gagal membuat PDF. Silakan coba lagi.');
    } finally {
      setExportingPdf(false);
    }
  }

  if (loading) return <p className="text-slate-600">Memuat subtotal...</p>;
  if (error) {
    return (
      <div role="alert" className="space-y-2 rounded-lg bg-red-50 p-3 text-sm text-red-700">
        <p>Gagal memuat subtotal: {error}</p>
        <button onClick={() => void loadResults()} className="font-medium underline">
          Coba lagi
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-slate-500">
          Live · diperbarui {lastUpdate.toLocaleTimeString('id-ID')}
        </p>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setSelectedParticipantId(results[0]?.id ?? '');
              setPdfError('');
              setShowPdfExport((open) => !open);
            }}
            disabled={!isLdwc || results.length === 0 || exportingPdf}
            className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <FileText className="h-4 w-4" />
            Ekspor PDF
          </button>
          <button
            onClick={() => void loadResults()}
            className="rounded p-1 hover:bg-slate-100"
            aria-label="Refresh"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>
      </div>
      {showPdfExport && (
        <section
          aria-labelledby="pdf-export-title"
          className="rounded-2xl border border-blue-100 bg-white p-4 shadow-sm sm:p-5"
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 id="pdf-export-title" className="font-bold text-blue-950">Ekspor nilai ke PDF</h3>
              <p className="mt-1 text-xs text-slate-600">
                Subtotal tersedia setelah penilaian dikirim. Rincian per regu juga dapat memuat skor draf.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowPdfExport(false)}
              className="rounded-lg p-1.5 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
              aria-label="Tutup menu ekspor PDF"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)_auto] sm:items-end">
            <label className="block text-xs font-semibold text-slate-700">
              Cakupan
              <select
                value={pdfScope}
                onChange={(event) => {
                  setPdfScope(event.target.value === 'participant' ? 'participant' : 'all');
                  setPdfError('');
                }}
                className="mt-1.5 min-h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
              >
                <option value="all">Semua regu</option>
                <option value="participant">Satu regu</option>
              </select>
            </label>
            {pdfScope === 'participant' && (
              <label className="block text-xs font-semibold text-slate-700">
                Pilih regu
                <select
                  value={selectedParticipantId}
                  onChange={(event) => setSelectedParticipantId(event.target.value)}
                  className="mt-1.5 min-h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                >
                  {results.map((participant) => (
                    <option key={participant.id} value={participant.id}>
                      #{participant.nomor_urut} · {participant.nama_regu} ({participant.category})
                    </option>
                  ))}
                </select>
              </label>
            )}
            <button
              type="button"
              onClick={() => void exportScoresPdf()}
              disabled={exportingPdf || (pdfScope === 'participant' && !selectedParticipantId)}
              className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-orange-500 px-4 py-2 text-sm font-bold text-blue-950 transition hover:bg-orange-400 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <ArrowDownToLine className="h-4 w-4" />
              {exportingPdf ? 'Menyiapkan PDF...' : 'Unduh PDF'}
            </button>
          </div>
          {pdfError && (
            <p role="alert" className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
              {pdfError}
            </p>
          )}
        </section>
      )}
      {template === 'LEGACY' ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          Event ini memakai template Legacy. Nilai lama tidak dihitung ulang menggunakan rubrik LDWC.
        </div>
      ) : (
        <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900">
          {configured
            ? 'Konfigurasi bobot tersedia; hasil akhir dapat dihitung.'
            : 'Bobot nilai akhir LDWC belum dikonfigurasi. Ranking dan nilai akhir tidak dihitung; tabel hanya menampilkan subtotal mentah.'}
        </div>
      )}
      {results.length === 0 && !error ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center text-slate-600">
          Belum ada peserta. Tambahkan peserta dulu di tab Peserta.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="min-w-[1550px] w-full">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-3 py-2 text-left text-xs font-semibold text-slate-600">Regu</th>
                <th className="px-3 py-2 text-left text-xs font-semibold text-slate-600">Kategori</th>
                <th className="px-3 py-2 text-left text-xs font-semibold text-slate-600">Status juri</th>
                <th className="px-3 py-2 text-right text-xs font-semibold text-slate-600">PBB J1</th>
                <th className="px-3 py-2 text-right text-xs font-semibold text-slate-600">PBB J2</th>
                <th className="px-3 py-2 text-right text-xs font-semibold text-slate-600">Danton PBB J1</th>
                <th className="px-3 py-2 text-right text-xs font-semibold text-slate-600">Danton PBB J2</th>
                <th className="px-3 py-2 text-right text-xs font-semibold text-slate-600">Variasi</th>
                <th className="px-3 py-2 text-right text-xs font-semibold text-slate-600">Formasi</th>
                <th className="px-3 py-2 text-right text-xs font-semibold text-slate-600">Danton VarFor</th>
                <th className="px-3 py-2 text-right text-xs font-semibold text-slate-600">Pengurangan*</th>
                <th className="px-3 py-2 text-right text-xs font-semibold text-slate-600">Voting*</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {results.map((participant) => (
                <tr key={participant.id}>
                  <td className="px-3 py-3">
                    <span className="font-semibold text-slate-900">{participant.nama_regu}</span>
                    <span className="block text-xs text-slate-500">#{participant.nomor_urut}</span>
                  </td>
                  <td className="px-3 py-3 text-sm">{participant.category}</td>
                  <td className="px-3 py-3">
                    <div className="flex gap-1">
                      {(['juri1', 'juri2', 'juri3'] as const).map((role, index) => (
                        <StatusDot key={role} ok={participant.submitted[role]} label={`J${index + 1}`} />
                      ))}
                    </div>
                  </td>
                  <td className="px-3 py-3 text-right font-mono text-sm">{displayScore(participant.scores.pbb1, maximums.pbb, isLdwc)}</td>
                  <td className="px-3 py-3 text-right font-mono text-sm">{displayScore(participant.scores.pbb2, maximums.pbb, isLdwc)}</td>
                  <td className="px-3 py-3 text-right font-mono text-sm">{displayScore(participant.scores.dantonPbb1, maximums.dantonPbb, isLdwc)}</td>
                  <td className="px-3 py-3 text-right font-mono text-sm">{displayScore(participant.scores.dantonPbb2, maximums.dantonPbb, isLdwc)}</td>
                  <td className="px-3 py-3 text-right font-mono text-sm">{displayScore(participant.scores.variasi, maximums.variasi, isLdwc)}</td>
                  <td className="px-3 py-3 text-right font-mono text-sm">{displayScore(participant.scores.formasi, maximums.formasi, isLdwc)}</td>
                  <td className="px-3 py-3 text-right font-mono text-sm">{displayScore(participant.scores.dantonVarfor, maximums.dantonVarfor, isLdwc)}</td>
                  <td className="px-3 py-3 text-right font-mono text-sm">{participant.deduction || '—'}</td>
                  <td className="px-3 py-3 text-right font-mono text-sm">{participant.vote_count || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p className="text-xs text-slate-500">
        * Pengurangan dan voting ditampilkan terpisah; penerapannya pada hasil akhir menunggu aturan panitia.
      </p>
    </div>
  );
}

function StatusDot({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span
      title={`${label}: ${ok ? 'Submit' : 'Belum'}`}
      className={`inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-xs font-medium ${
        ok ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'
      }`}
    >
      {ok ? <CheckCircle2 className="h-3 w-3" /> : <Circle className="h-3 w-3" />}
      {label}
    </span>
  );
}
