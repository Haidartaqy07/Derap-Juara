'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import ConfirmDialog from '@/components/confirm-dialog';
import {
  calculateChampionshipAwards,
  type AwardWinner,
  type ChampionshipAward,
  type ChampionshipCategoryAwards,
  type ChampionshipScoreInput,
} from '@/lib/championship-awards';
import {
  getLdwcItems,
  getLdwcMaximums,
  LDWC_DEFAULT_RUBRIC,
  parseLdwcRubric,
} from '@/lib/ldwc-rubric';
import { computeRaw, computeRawFromSharedScores, type SubmissionScore } from '@/lib/scoring';
import type { ParticipantCategory } from '@/types';
import { Award, CalendarClock, CheckCircle2, CircleAlert, Medal, RefreshCw, Send } from 'lucide-react';

type Participant = {
  id: string;
  nama_regu: string;
  nomor_urut: number;
  category: ParticipantCategory;
  vote_count: number;
};

type Submission = {
  participant_id: string;
  juri_role: 'juri1' | 'juri2' | 'juri3';
  submitted: boolean;
  pbb_scores?: unknown;
  danton_scores?: unknown;
  scores?: unknown;
};

type PublishedAnnouncement = {
  awards: ChampionshipCategoryAwards[];
  announced_at: string;
};

function awardGroupId(category: string, title: string) {
  const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  return `preview-award-${category.toLowerCase()}-${slug}`;
}

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

function buildAwardScores(
  participants: Participant[],
  pbbSubmissions: Submission[],
  varforSubmissions: Submission[],
  rubricValue: unknown
) {
  const rubric = parseLdwcRubric(rubricValue ?? LDWC_DEFAULT_RUBRIC);
  const items = getLdwcItems(rubric);
  const maximums = getLdwcMaximums(rubric);
  const missing: string[] = [];
  const scores: ChampionshipScoreInput[] = [];

  for (const participant of participants) {
    const pbb1 = pbbSubmissions.find(
      (submission) => submission.participant_id === participant.id && submission.juri_role === 'juri1'
    );
    const pbb2 = pbbSubmissions.find(
      (submission) => submission.participant_id === participant.id && submission.juri_role === 'juri2'
    );
    const varfor = varforSubmissions.find(
      (submission) => submission.participant_id === participant.id && submission.juri_role === 'juri3'
    );
    const missingRoles: string[] = [];

    if (!pbb1?.submitted) missingRoles.push('Juri 1');
    if (!pbb2?.submitted) missingRoles.push('Juri 2');
    if (!varfor?.submitted) missingRoles.push('Juri 3');
    if (missingRoles.length) {
      missing.push(`${participant.nama_regu} (J${missingRoles.map((role) => role.replace('Juri ', '')).join(', ')})`);
      continue;
    }

    const pbbJ1 = computeRaw(items.pbb, scoresFrom(pbb1?.pbb_scores), true);
    const pbbJ2 = computeRaw(items.pbb, scoresFrom(pbb2?.pbb_scores), true);
    const dantonPbbJ1 = computeRaw(items.dantonPbb, scoresFrom(pbb1?.danton_scores), true);
    const dantonPbbJ2 = computeRaw(items.dantonPbb, scoresFrom(pbb2?.danton_scores), true);
    const sharedScores = scoresFrom(varfor?.scores);
    const variasi = computeRawFromSharedScores(items.variasi, sharedScores, true);
    const formasi = computeRawFromSharedScores(items.formasi, sharedScores, true);
    const dantonVarfor = computeRawFromSharedScores(items.dantonVarfor, sharedScores, true);

    if (
      pbbJ1 === null ||
      pbbJ2 === null ||
      dantonPbbJ1 === null ||
      dantonPbbJ2 === null ||
      variasi === null ||
      formasi === null ||
      dantonVarfor === null
    ) {
      missing.push(`${participant.nama_regu} (nilai final belum lengkap atau tidak sesuai rubrik)`);
      continue;
    }

    scores.push({
      ...participant,
      vote_count: Number(participant.vote_count ?? 0),
      pbbJ1,
      pbbJ2,
      dantonPbbJ1,
      dantonPbbJ2,
      variasi,
      formasi,
      dantonVarfor,
    });
  }

  return { scores, missing, maximums };
}

export default function ChampionshipAnnouncementTab({ eventId }: { eventId: string }) {
  const [eventName, setEventName] = useState('');
  const [preview, setPreview] = useState<ChampionshipCategoryAwards[]>([]);
  const [missing, setMissing] = useState<string[]>([]);
  const [published, setPublished] = useState<PublishedAnnouncement | null>(null);
  const [loading, setLoading] = useState(true);
  const [publishing, setPublishing] = useState(false);
  const [confirmPublish, setConfirmPublish] = useState(false);
  const [error, setError] = useState('');
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);

  const load = useCallback(async (showLoading = false) => {
    if (showLoading) setLoading(true);
    setError('');
    const supabase = createClient();
    const [
      { data: event, error: eventError },
      { data: participants, error: participantError },
      { data: pbb, error: pbbError },
      { data: varfor, error: varforError },
      { data: announcement, error: announcementError },
    ] = await Promise.all([
      supabase.from('events').select('name, scoring_template, rubric').eq('id', eventId).single(),
      supabase
        .from('participants')
        .select('id, nama_regu, nomor_urut, category, vote_count')
        .eq('event_id', eventId)
        .order('nomor_urut'),
      supabase
        .from('pbb_submissions')
        .select('participant_id, juri_role, submitted, pbb_scores, danton_scores')
        .eq('event_id', eventId),
      supabase
        .from('variasi_submissions')
        .select('participant_id, juri_role, submitted, scores')
        .eq('event_id', eventId),
      supabase
        .from('event_award_announcements')
        .select('awards, announced_at')
        .eq('event_id', eventId)
        .maybeSingle(),
    ]);

    const failed = eventError ?? participantError ?? pbbError ?? varforError ?? announcementError;
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
    setEventName(event.name);
    if (announcement) {
      setPublished({
        awards: announcement.awards as ChampionshipCategoryAwards[],
        announced_at: announcement.announced_at,
      });
    } else {
      setPublished(null);
    }

    if (event.scoring_template !== 'LDWC_2026') {
      setError('Pengumuman juara otomatis hanya tersedia untuk event dengan template LDWC 2026.');
      setPreview([]);
      setMissing([]);
      setLoading(false);
      return;
    }
    if (!participants?.length) {
      setError('Tambahkan peserta terlebih dahulu sebelum menghitung juara.');
      setPreview([]);
      setMissing([]);
      setLoading(false);
      return;
    }

    try {
      const { scores, missing: missingScores, maximums } = buildAwardScores(
        participants as Participant[],
        (pbb ?? []) as Submission[],
        (varfor ?? []) as Submission[],
        event.rubric
      );
      setMissing(missingScores);
      setPreview(missingScores.length ? [] : calculateChampionshipAwards(scores, maximums));
    } catch (calculationError) {
      setPreview([]);
      setMissing([]);
      setError(
        calculationError instanceof Error
          ? calculationError.message
          : 'Gagal menghitung hasil juara.'
      );
    }
    setUpdatedAt(new Date());
    setLoading(false);
  }, [eventId]);

  useEffect(() => {
    void load(true);
    const supabase = createClient();
    const channel = supabase
      .channel(`championship-awards-${eventId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pbb_submissions', filter: `event_id=eq.${eventId}` }, () => void load())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'variasi_submissions', filter: `event_id=eq.${eventId}` }, () => void load())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'participants', filter: `event_id=eq.${eventId}` }, () => void load())
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [eventId, load]);

  const hasWinners = useMemo(
    () => preview.some((category) => category.awards.some((item) => item.winners.length > 0)),
    [preview]
  );

  async function announce() {
    setPublishing(true);
    const supabase = createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      setError(userError?.message ?? 'Sesi admin tidak ditemukan. Silakan masuk kembali.');
      setPublishing(false);
      setConfirmPublish(false);
      return;
    }

    const { error: saveError } = await supabase
      .from('event_award_announcements')
      .upsert(
        {
          event_id: eventId,
          awards: preview,
          announced_at: new Date().toISOString(),
          announced_by: user.id,
        },
        { onConflict: 'event_id' }
      );
    if (saveError) {
      setError(`Gagal mengumumkan juara: ${saveError.message}`);
    } else {
      await load();
    }
    setPublishing(false);
    setConfirmPublish(false);
  }

  if (loading) return <p className="rounded-2xl border border-slate-200 bg-white p-5 text-slate-600 shadow-sm">Memuat hasil juara...</p>;

  return (
    <div className="space-y-5">
      <section className="rounded-2xl border border-orange-200 bg-gradient-to-br from-blue-950 to-blue-900 p-5 text-white shadow-sm sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-orange-500 text-blue-950">
              <Award className="h-6 w-6" />
            </span>
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-orange-200">Pratinjau hasil resmi</p>
              <h3 className="mt-1 text-lg font-black">{eventName}</h3>
              <p className="mt-1 text-sm text-blue-100">
                Rumus Juara Utama/Harapan dan Juara Umum mengikuti ketentuan panitia. Hasil belum tampil ke publik sampai diumumkan.
              </p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={() => void load(true)}
              className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-4 text-sm font-semibold text-white transition hover:bg-white/20"
            >
              <RefreshCw className="h-4 w-4" />
              Perbarui
            </button>
            <button
              type="button"
              onClick={() => setConfirmPublish(true)}
              disabled={!hasWinners || Boolean(missing.length) || Boolean(error) || publishing}
              className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-orange-500 px-4 text-sm font-bold text-blue-950 shadow-sm transition hover:bg-orange-400 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Send className="h-4 w-4" />
              {published ? 'Umumkan Ulang' : 'Umumkan Semua Juara'}
            </button>
          </div>
        </div>
        {updatedAt && (
          <p className="mt-4 flex items-center gap-1.5 text-xs text-blue-200">
            <CalendarClock className="h-3.5 w-3.5" />
            Pratinjau diperbarui {updatedAt.toLocaleTimeString('id-ID')}
          </p>
        )}
      </section>

      {published && (
        <div className="flex flex-col gap-1 rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-900 sm:flex-row sm:items-center sm:justify-between">
          <span className="flex items-center gap-2 font-semibold">
            <CheckCircle2 className="h-4 w-4" />
            Pengumuman publik aktif. Umumkan ulang untuk mengganti hasil yang ditampilkan.
          </span>
          <span className="text-xs text-green-800">
            {new Date(published.announced_at).toLocaleString('id-ID')}
          </span>
        </div>
      )}

      {error && (
        <div role="alert" className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" />
          <div>
            <p>{error}</p>
            {error.includes('event_award_announcements') && (
              <p className="mt-1">Jalankan migration `20261107_championship_announcements.sql` di Supabase.</p>
            )}
          </div>
        </div>
      )}

      {missing.length > 0 && !error && (
        <section className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
          <h3 className="font-bold text-amber-950">Belum bisa menghitung juara</h3>
          <p className="mt-1 text-sm text-amber-900">
            Semua penilaian harus sudah difinalkan admin dan lengkap untuk seluruh peserta sebelum hasil diumumkan.
          </p>
          <ul className="mt-3 grid gap-1 text-sm text-amber-900 sm:grid-cols-2">
            {missing.map((item) => <li key={item}>• {item}</li>)}
          </ul>
        </section>
      )}

      {preview.map((category) => (
        <section key={category.category} className="space-y-3">
          <div className="flex items-center gap-3 border-b-2 border-orange-200 pb-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-950 text-orange-200">
              <Medal className="h-5 w-5" />
            </span>
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-orange-600">Kategori</p>
              <h3 className="text-xl font-black text-blue-950">{category.category}</h3>
            </div>
          </div>
          <nav aria-label={`Navigasi penghargaan ${category.category}`} className="flex gap-2 overflow-x-auto pb-2">
            {Array.from(new Set(category.awards.map((item) => item.title))).map((title) => (
              <a
                key={title}
                href={`#${awardGroupId(category.category, title)}`}
                className="shrink-0 rounded-full border border-blue-100 bg-blue-50 px-3 py-1.5 text-xs font-bold text-blue-900 transition hover:border-orange-300 hover:bg-orange-50 hover:text-orange-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-500"
              >
                {title}
              </a>
            ))}
          </nav>
          <div className="space-y-5">
            {Array.from(new Set(category.awards.map((item) => item.title))).map((title) => (
              <section key={title} id={awardGroupId(category.category, title)} className="scroll-mt-24">
                <div className="mb-3 flex items-center gap-3">
                  <span className="h-1 w-8 rounded-full bg-orange-500" />
                  <h4 className="text-sm font-extrabold uppercase tracking-wide text-blue-950">{title}</h4>
                  <span className="h-px flex-1 bg-slate-200" />
                </div>
                <div className="grid gap-3 lg:grid-cols-2">
                  {category.awards
                    .filter((item) => item.title === title)
                    .map((item) => (
                      <AwardCard key={`${category.category}-${item.key}`} item={item} />
                    ))}
                </div>
              </section>
            ))}
          </div>
        </section>
      ))}

      <ConfirmDialog
        open={confirmPublish}
        title={published ? 'Umumkan ulang semua juara?' : 'Umumkan semua juara?'}
        message={`Semua kategori juara untuk event ${eventName} akan ditampilkan di halaman publik. ${
          published ? 'Pengumuman sebelumnya akan diganti.' : ''
        }`}
        confirmLabel={published ? 'Umumkan Ulang' : 'Umumkan'}
        cancelLabel="Periksa Lagi"
        loading={publishing}
        onConfirm={() => void announce()}
        onCancel={() => {
          if (!publishing) setConfirmPublish(false);
        }}
      />
    </div>
  );
}

function AwardCard({ item }: { item: ChampionshipAward }) {
  return (
    <article className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <header className="flex items-center justify-between gap-3 border-b border-slate-100 bg-slate-50 px-4 py-3">
        <div>
          <h4 className="font-bold text-blue-950">{item.title}</h4>
          <p className="text-xs text-slate-500">{item.placement}</p>
        </div>
        <Award className="h-5 w-5 shrink-0 text-orange-500" />
      </header>
      <div className="space-y-3 p-4">
        {item.winners.length === 0 ? (
          <p className="text-sm text-slate-500">Belum tersedia untuk jumlah peserta saat ini.</p>
        ) : item.winners.map((winner) => (
          <WinnerDetails key={winner.participantId} winner={winner} item={item} />
        ))}
      </div>
    </article>
  );
}

function WinnerDetails({ winner, item }: { winner: AwardWinner; item: ChampionshipAward }) {
  const isWeighted = winner.details.some((detail) => detail.weight !== null);
  return (
    <div className="rounded-xl border border-orange-100 bg-orange-50/50 p-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-bold text-slate-900">
            <span className="mr-1.5 rounded-md bg-blue-950 px-2 py-0.5 font-mono text-xs text-orange-200">
              #{winner.nomor_urut}
            </span>
            {winner.nama_regu}
          </p>
          <p className="mt-1 text-xs text-slate-600">{winner.category} · {item.placement}</p>
        </div>
        <span className="shrink-0 rounded-lg bg-white px-2.5 py-1 font-mono text-sm font-bold text-blue-950 shadow-sm">
          {winner.score.toFixed(2)}{isWeighted ? ' poin' : ''}
        </span>
      </div>
      <div className="mt-3 space-y-1 border-t border-orange-100 pt-2">
        {winner.details.map((detail) => (
          <div key={detail.label} className="flex items-start justify-between gap-3 text-xs">
            <span className="text-slate-600">
              {detail.label}{detail.weight === null ? '' : ` · ${detail.weight}%`}
            </span>
            <span className="shrink-0 text-right font-mono font-semibold text-slate-800">
              {detail.raw.toFixed(2)}/{detail.maximum}
              {detail.weight === null ? '' : ` → ${detail.points.toFixed(2)}`}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
