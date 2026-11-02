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
import { CheckCircle2, Circle, RefreshCw } from 'lucide-react';

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
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadResults = useCallback(async () => {
    setError('');
    const supabase = createClient();
    const [
      { data: event, error: eventError },
      { data: participants, error: participantsError },
    ] = await Promise.all([
      supabase.from('events').select('scoring_template, rubric').eq('id', eventId).single(),
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
        <button onClick={() => void loadResults()} className="rounded p-1 hover:bg-slate-100" aria-label="Refresh">
          <RefreshCw className="h-4 w-4" />
        </button>
      </div>
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
