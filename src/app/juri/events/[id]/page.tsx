'use client';

import { useEffect, useState, use } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { Peserta, UserRole } from '@/types';
import { ArrowLeft, ArrowRight, CheckCircle2, Circle } from 'lucide-react';

type PesertaWithStatus = Peserta & {
  has_data: boolean;
  is_draft_submitted: boolean;
  is_submitted: boolean;
};

export default function JuriEventDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const paramsValue = params instanceof Promise ? use(params) : params;
  const { id } = paramsValue;
  const [peserta, setPeserta] = useState<PesertaWithStatus[]>([]);
  const [eventName, setEventName] = useState('');
  const [role, setRole] = useState<UserRole | null>(null);
  const [loading, setLoading] = useState(true);
  const [accessError, setAccessError] = useState('');

  useEffect(() => {
    load();
  }, [id]);

  async function load() {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const { data: prof } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();
    if (!prof || !['juri1', 'juri2', 'juri3'].includes(prof.role)) {
      setAccessError('Akun ini tidak memiliki peran juri.');
      setLoading(false);
      return;
    }
    const userRole = prof.role as UserRole;
    setRole(userRole);

    const { data: assignment, error: assignmentError } = await supabase
      .from('event_judges')
      .select('event_id')
      .eq('event_id', id)
      .eq('user_id', user.id)
      .eq('tipe_juri', userRole)
      .maybeSingle();
    if (assignmentError) {
      setAccessError('Gagal memeriksa penugasan juri: ' + assignmentError.message);
      setLoading(false);
      return;
    }
    if (!assignment) {
      setAccessError('Anda tidak ditugaskan sebagai juri untuk event ini.');
      setLoading(false);
      return;
    }

    const { data: ev, error: eventError } = await supabase
      .from('events')
      .select('name, scoring_template')
      .eq('id', id)
      .single();
    if (eventError || !ev) {
      setAccessError(eventError?.message ?? 'Event tidak ditemukan.');
      setLoading(false);
      return;
    }
    setEventName(ev?.name || '');
    if (ev.scoring_template !== 'LDWC_2026') {
      setAccessError('Event ini memakai template Legacy. Admin perlu menyiapkan event LDWC sebelum penilaian dibuka.');
      setLoading(false);
      return;
    }

    const { data: pst } = await supabase
      .from('participants')
      .select('*')
      .eq('event_id', id)
      .order('nomor_urut');

    if (!pst) {
      setPeserta([]);
      setLoading(false);
      return;
    }

    const pesertaIds = pst.map((p) => p.id);

    // Status submit per peserta untuk juri ini
    // Catatan: record penilaian diidentifikasi pakai tipe_juri, bukan juri_id
    let statuses: Map<string, { hasData: boolean; draftSubmitted: boolean; submitted: boolean }> =
      new Map();

    if (userRole === 'juri1' || userRole === 'juri2') {
      const { data: pen } = await supabase
        .from('pbb_submissions')
        .select('participant_id, submitted, draft_submitted_at')
        .in('participant_id', pesertaIds)
        .eq('juri_role', userRole);
      pen?.forEach((p) =>
        statuses.set(p.participant_id, {
          hasData: true,
          draftSubmitted: Boolean(p.draft_submitted_at),
          submitted: p.submitted,
        }),
      );
    } else if (userRole === 'juri3') {
      const table = 'variasi_submissions';
      const { data: pen } = await supabase
        .from(table)
        .select('participant_id, submitted, draft_submitted_at')
        .in('participant_id', pesertaIds)
        .eq('juri_role', userRole);
      pen?.forEach((p) =>
        statuses.set(p.participant_id, {
          hasData: true,
          draftSubmitted: Boolean(p.draft_submitted_at),
          submitted: p.submitted,
        }),
      );
    }

    const result: PesertaWithStatus[] = pst.map((p) => {
      const s = statuses.get(p.id);
      return {
        ...p,
        has_data: s?.hasData ?? false,
        is_draft_submitted: s?.draftSubmitted ?? false,
        is_submitted: s?.submitted ?? false,
      };
    });

    setPeserta(result);
    setLoading(false);
  }

  if (loading) return <p className="rounded-2xl border border-slate-200 bg-white p-5 text-slate-600 shadow-sm">Memuat peserta...</p>;
  if (accessError) return <p role="alert" className="rounded-2xl border border-red-200 bg-red-50 p-4 text-red-700">{accessError}</p>;

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <Link
          href="/juri"
          className="mb-3 inline-flex min-h-11 items-center gap-2 rounded-lg pr-3 text-sm font-semibold text-slate-600 transition hover:text-orange-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400"
        >
          <ArrowLeft className="h-4 w-4" />
          Kembali ke Daftar Event
        </Link>
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-orange-600">Daftar penilaian</p>
        <h2 className="mt-1 text-xl font-black text-blue-950 sm:text-2xl">{eventName}</h2>
        <p className="mt-1 text-sm text-slate-600">Pilih peserta untuk membuka lembar penilaian.</p>
      </div>

      {peserta.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-slate-600 shadow-sm">
          Belum ada peserta di event ini
        </div>
      ) : (
        <div className="space-y-2">
          {peserta.map((p) => (
            <Link
              key={p.id}
              href={`/juri/events/${id}/peserta/${p.id}`}
              className="group flex min-h-20 items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-orange-300 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 sm:p-5"
            >
              <div className="flex items-center gap-3">
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-blue-950 font-mono text-sm font-bold text-orange-200">
                  #{p.nomor_urut}
                </span>
                <div className="min-w-0">
                  <p className="font-bold text-blue-950">{p.nama_regu}</p>
                  <p className="text-xs text-slate-500">{p.category}</p>
                  <StatusBadge
                    hasData={p.has_data}
                    draftSubmitted={p.is_draft_submitted}
                    submitted={p.is_submitted}
                  />
                </div>
              </div>
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-orange-50 text-orange-600 transition group-hover:bg-orange-500 group-hover:text-white">
                <ArrowRight className="h-5 w-5" />
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

function StatusBadge({
  hasData,
  draftSubmitted,
  submitted,
}: {
  hasData: boolean;
  draftSubmitted: boolean;
  submitted: boolean;
}) {
  if (submitted) {
    return (
      <span className="mt-1 inline-flex items-center gap-1 rounded-lg bg-green-100 px-2 py-1 text-xs font-semibold text-green-700">
        <CheckCircle2 className="h-3 w-3" />
        Final oleh Admin · Terkunci
      </span>
    );
  }
  if (draftSubmitted) {
    return (
      <span className="mt-1 inline-flex items-center gap-1 rounded-lg bg-orange-100 px-2 py-1 text-xs font-semibold text-orange-800">
        <CheckCircle2 className="h-3 w-3" />
        Draf dikirim
      </span>
    );
  }
  if (hasData) {
    return (
      <span className="mt-0.5 inline-flex items-center gap-1 rounded bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
        <Circle className="h-3 w-3 fill-blue-400" />
        Sedang dinilai
      </span>
    );
  }
  return (
    <span className="mt-0.5 inline-flex items-center gap-1 rounded bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
      <Circle className="h-3 w-3" />
      Belum dinilai
    </span>
  );
}