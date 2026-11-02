'use client';

import { useCallback, useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import {
  getLdwcItems,
  LDWC_DEFAULT_RUBRIC,
  parseLdwcRubric,
  type LdwcRubric,
  type RubricItem,
} from '@/lib/ldwc-rubric';
import { computeRawFromSharedScores, type SubmissionScore } from '@/lib/scoring';
import { CheckCircle2, Circle, Clock3, Download, LockKeyhole, Unlock } from 'lucide-react';

type Role = 'juri1' | 'juri2' | 'juri3';
type TableName = 'pbb_submissions' | 'variasi_submissions';

type Submission = {
  id: string;
  participant_id: string;
  juri_role: Role;
  submitted: boolean;
  draft_submitted_at: string | null;
  submitted_at: string | null;
  pbb_scores?: unknown;
  danton_scores?: unknown;
  scores?: unknown;
};

type ParticipantRow = {
  id: string;
  nama_regu: string;
  nomor_urut: number;
  category: string;
  submissions: Partial<Record<Role, Submission>>;
};
type ScoringTemplate = 'LDWC_2026' | 'LEGACY';

function parseScores(raw: unknown): SubmissionScore[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter(
    (score): score is SubmissionScore =>
      typeof score === 'object' &&
      score !== null &&
      Number.isInteger((score as SubmissionScore).itemId) &&
      typeof (score as SubmissionScore).value === 'number'
  );
}

function rawTotal(items: RubricItem[], scores: unknown, submitted: boolean) {
  return computeRawFromSharedScores(
    items,
    parseScores(scores),
    submitted
  );
}

function isSubmissionComplete(submission: Submission, rubric: LdwcRubric) {
  const items = getLdwcItems(rubric);
  if (submission.juri_role === 'juri1' || submission.juri_role === 'juri2') {
    return (
      rawTotal(items.pbb, submission.pbb_scores, true) !== null &&
      rawTotal(items.dantonPbb, submission.danton_scores, true) !== null
    );
  }
  return (
    rawTotal(items.variasi, submission.scores, true) !== null &&
    rawTotal(items.formasi, submission.scores, true) !== null &&
    rawTotal(items.dantonVarfor, submission.scores, true) !== null
  );
}

function csvCell(value: string | number | null) {
  const text = value === null ? '' : String(value);
  return `"${text.replace(/"/g, '""')}"`;
}

export default function KelolaPenilaianTab({ eventId }: { eventId: string }) {
  const [participants, setParticipants] = useState<ParticipantRow[]>([]);
  const [eventName, setEventName] = useState('');
  const [template, setTemplate] = useState<ScoringTemplate | null>(null);
  const [rubric, setRubric] = useState<LdwcRubric>(LDWC_DEFAULT_RUBRIC);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async (showLoading = false) => {
    if (showLoading) setLoading(true);
    setLoadError('');
    const supabase = createClient();
    const [
      { data: event, error: eventError },
      { data: participantsData, error: participantError },
    ] = await Promise.all([
      supabase.from('events').select('name, scoring_template, rubric').eq('id', eventId).single(),
      supabase
        .from('participants')
        .select('id, nama_regu, nomor_urut, category')
        .eq('event_id', eventId)
        .order('nomor_urut'),
    ]);

    if (eventError || participantError) {
      setLoadError(eventError?.message ?? participantError?.message ?? 'Gagal memuat data event.');
      setLoading(false);
      return;
    }

    setEventName(event.name);
    setTemplate(event.scoring_template);
    try {
      setRubric(parseLdwcRubric(event.rubric ?? LDWC_DEFAULT_RUBRIC));
    } catch (rubricError) {
      setLoadError(rubricError instanceof Error ? rubricError.message : 'Rubrik event tidak valid.');
      setLoading(false);
      return;
    }
    if (participantsData.length === 0) {
      setParticipants([]);
      setLoading(false);
      return;
    }

    const participantIds = participantsData.map(({ id }) => id);
    const [
      { data: pbb, error: pbbError },
      { data: variasi, error: variasiError },
    ] = await Promise.all([
      supabase
        .from('pbb_submissions')
        .select('id, participant_id, juri_role, submitted, draft_submitted_at, submitted_at, pbb_scores, danton_scores')
        .in('participant_id', participantIds),
      supabase
        .from('variasi_submissions')
        .select('id, participant_id, juri_role, submitted, draft_submitted_at, submitted_at, scores')
        .in('participant_id', participantIds),
    ]);
    const failed = [pbbError, variasiError].find(Boolean);
    if (failed) {
      setLoadError(failed.message);
      setLoading(false);
      return;
    }

    const allSubmissions = [
      ...(pbb as Submission[]),
      ...(variasi as Submission[]),
    ];
    setParticipants(
      participantsData.map((participant) => ({
        ...participant,
        submissions: Object.fromEntries(
          allSubmissions
            .filter((submission) => submission.participant_id === participant.id)
            .map((submission) => [submission.juri_role, submission])
        ),
      }))
    );
    setLoading(false);
  }, [eventId]);

  useEffect(() => {
    void load(true);
    const supabase = createClient();
    const channel = supabase
      .channel(`admin-scoring-review-${eventId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'pbb_submissions', filter: `event_id=eq.${eventId}` },
        () => void load(),
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'variasi_submissions', filter: `event_id=eq.${eventId}` },
        () => void load(),
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [eventId, load]);

  async function finalizeDraft(table: TableName, submission: Submission) {
    if (template === 'LDWC_2026' && !isSubmissionComplete(submission, rubric)) {
      alert('Penilaian belum lengkap. Minta juri melengkapi semua indikator sebelum finalisasi.');
      return;
    }
    if (!confirm('Finalkan penilaian ini? Juri tidak dapat mengubah nilai setelah dikunci.')) return;
    setBusyId(submission.id);
    const { error } = await createClient()
      .from(table)
      .update({ submitted: true, submitted_at: new Date().toISOString() })
      .eq('id', submission.id);
    if (error) {
      alert('Gagal memfinalkan penilaian: ' + error.message);
    } else {
      await load();
    }
    setBusyId(null);
  }

  async function unlockSubmission(table: TableName, submission: Submission) {
    if (!confirm('Buka kunci agar juri dapat merevisi penilaian?')) return;
    setBusyId(submission.id);
    const { error } = await createClient()
      .from(table)
      .update({ submitted: false, submitted_at: null })
      .eq('id', submission.id);
    if (error) {
      alert('Gagal membuka kunci penilaian: ' + error.message);
    } else {
      await load();
    }
    setBusyId(null);
  }

  function exportSubtotals() {
    if (template !== 'LDWC_2026') {
      alert('Ekspor subtotal LDWC hanya tersedia untuk event dengan template LDWC 2026.');
      return;
    }
    const headers = [
      'Nomor Urut', 'Regu', 'Kategori', 'Juri 1 Final Admin', 'Juri 2 Final Admin', 'Juri 3 Final Admin',
      'PBB Juri 1', 'PBB Juri 2', 'Danton PBB Juri 1', 'Danton PBB Juri 2',
      'Variasi', 'Formasi', 'Danton Variasi/Formasi',
    ];
    const items = getLdwcItems(rubric);
    const rows = participants.map((participant) => {
      const { juri1, juri2, juri3 } = participant.submissions;
      const pbb1 = rawTotal(items.pbb, juri1?.pbb_scores, juri1?.submitted === true);
      const pbb2 = rawTotal(items.pbb, juri2?.pbb_scores, juri2?.submitted === true);
      const danton1 = rawTotal(items.dantonPbb, juri1?.danton_scores, juri1?.submitted === true);
      const danton2 = rawTotal(items.dantonPbb, juri2?.danton_scores, juri2?.submitted === true);
      const juri3Scores = juri3?.scores;
      return [
        participant.nomor_urut,
        participant.nama_regu,
        participant.category,
        juri1?.submitted ? 'Ya' : 'Belum',
        juri2?.submitted ? 'Ya' : 'Belum',
        juri3?.submitted ? 'Ya' : 'Belum',
        pbb1,
        pbb2,
        danton1,
        danton2,
        rawTotal(items.variasi, juri3Scores, juri3?.submitted === true),
        rawTotal(items.formasi, juri3Scores, juri3?.submitted === true),
        rawTotal(items.dantonVarfor, juri3Scores, juri3?.submitted === true),
      ];
    });

    const csv = [headers, ...rows].map((row) => row.map(csvCell).join(',')).join('\r\n');
    const url = URL.createObjectURL(new Blob(['\uFEFF', csv], { type: 'text/csv;charset=utf-8' }));
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `Subtotal_LDWC_${eventName.replace(/[\\/:*?"<>|]/g, '_')}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  if (loading) return <p className="text-slate-600">Memuat penilaian...</p>;
  if (loadError) return <p className="text-red-600">Gagal memuat penilaian: {loadError}</p>;

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
        Juri mengirim penilaian sebagai draf dan tetap dapat memperbaikinya. Finalisasi di sini akan mengunci nilai;
        admin dapat membuka kunci kembali jika diperlukan. Ekspor hanya memuat status dan subtotal rubrik LDWC,
        bukan peringkat atau nilai akhir.
        {template === 'LEGACY' && (
          <p className="mt-1">Event Legacy tidak dapat diekspor sebagai LDWC agar skor lama tidak salah ditafsirkan.</p>
        )}
      </div>
      <button
        onClick={exportSubtotals}
        disabled={participants.length === 0 || template !== 'LDWC_2026'}
        className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
      >
        <Download className="h-4 w-4" />
        Ekspor Subtotal CSV
      </button>
      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="min-w-[900px] w-full">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-3 py-2 text-left text-xs font-semibold text-slate-600">Peserta</th>
              {(['juri1', 'juri2', 'juri3'] as const).map((role, index) => (
                <th key={role} className="px-3 py-2 text-center text-xs font-semibold text-slate-600">
                  Juri {index + 1} ({['PBB', 'PBB', 'Variasi/Formasi'][index]})
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {participants.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-sm text-slate-500">Belum ada peserta</td>
              </tr>
            ) : (
              participants.map((participant) => (
                <tr key={participant.id}>
                  <td className="px-3 py-3 text-sm">
                    <span className="font-medium text-slate-900">{participant.nama_regu}</span>
                    <span className="block text-xs text-slate-500">#{participant.nomor_urut} · {participant.category}</span>
                  </td>
                  {(['juri1', 'juri2', 'juri3'] as const).map((role, index) => {
                    const submission = participant.submissions[role];
                    const table: TableName = index < 2 ? 'pbb_submissions' : 'variasi_submissions';
                    const complete =
                      template !== 'LDWC_2026' || !submission || isSubmissionComplete(submission, rubric);
                    return (
                      <td key={role} className="px-3 py-3 text-center">
                        <StatusCell
                          submission={submission}
                          complete={complete}
                          busy={submission ? busyId === submission.id : false}
                          onFinalize={
                            submission?.draft_submitted_at && !submission.submitted
                              ? () => void finalizeDraft(table, submission)
                              : undefined
                          }
                          onUnlock={submission?.submitted ? () => void unlockSubmission(table, submission) : undefined}
                        />
                      </td>
                    );
                  })}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function StatusCell({
  submission,
  complete,
  busy,
  onFinalize,
  onUnlock,
}: {
  submission: Submission | undefined;
  complete: boolean;
  busy: boolean;
  onFinalize?: () => void;
  onUnlock?: () => void;
}) {
  if (!submission) {
    return <span className="text-xs text-slate-400">Belum ada draf</span>;
  }
  if (!submission.submitted) {
    return (
      <div className="flex flex-col items-center gap-1.5">
        <span className={`inline-flex items-center gap-1 text-xs ${submission.draft_submitted_at ? 'font-semibold text-orange-800' : 'text-slate-500'}`}>
          {submission.draft_submitted_at ? <Clock3 className="h-3 w-3" /> : <Circle className="h-3 w-3" />}
          {submission.draft_submitted_at ? 'Draf dikirim' : 'Sedang dinilai'}
        </span>
        {onFinalize && (
          <>
            {!complete && <span className="text-[11px] text-amber-700">Lengkapi nilai sebelum final</span>}
            <button
              onClick={onFinalize}
              disabled={busy || !complete}
              className="inline-flex min-h-9 items-center gap-1 rounded-lg bg-orange-100 px-2.5 py-1 text-xs font-semibold text-blue-950 hover:bg-orange-200 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {busy ? 'Menyimpan...' : <><LockKeyhole className="h-3 w-3" /> Kunci & Finalkan</>}
            </button>
          </>
        )}
      </div>
    );
  }
  return (
    <div className="flex flex-col items-center gap-1">
      <span className="inline-flex items-center gap-1 rounded bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
        <CheckCircle2 className="h-3 w-3" />
        Submitted
      </span>
      {onUnlock && (
        <button
          onClick={onUnlock}
          disabled={busy}
          className="inline-flex items-center gap-1 rounded bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700 hover:bg-red-200 disabled:opacity-50"
        >
          {busy ? 'Menyimpan...' : <><Unlock className="h-3 w-3" /> Buka kunci</>}
        </button>
      )}
    </div>
  );
}
