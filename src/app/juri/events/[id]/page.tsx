'use client';

import { useEffect, useState, use } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { Peserta, UserRole } from '@/types';
import { ArrowLeft, ArrowRight, CheckCircle2, Lock, Circle } from 'lucide-react';

type PesertaWithStatus = Peserta & {
  is_submitted: boolean;
  is_locked: boolean;
};

export default function JuriEventDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [peserta, setPeserta] = useState<PesertaWithStatus[]>([]);
  const [eventName, setEventName] = useState('');
  const [role, setRole] = useState<UserRole | null>(null);
  const [loading, setLoading] = useState(true);

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
    const userRole = prof?.role as UserRole;
    setRole(userRole);

    const { data: ev } = await supabase
      .from('events')
      .select('nama_event')
      .eq('id', id)
      .single();
    setEventName(ev?.nama_event || '');

    const { data: pst } = await supabase
      .from('peserta')
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
    let statuses: Map<string, { submitted: boolean; locked: boolean }> = new Map();

    if (userRole === 'juri1' || userRole === 'juri2') {
      const { data: pen } = await supabase
        .from('penilaian_pbb')
        .select('peserta_id, is_submitted, is_locked')
        .in('peserta_id', pesertaIds)
        .eq('juri_id', user.id);
      pen?.forEach((p) =>
        statuses.set(p.peserta_id, { submitted: p.is_submitted, locked: p.is_locked })
      );
    } else if (userRole === 'juri3') {
      const { data: pen } = await supabase
        .from('penilaian_varfor')
        .select('peserta_id, is_submitted, is_locked')
        .in('peserta_id', pesertaIds)
        .eq('juri_id', user.id);
      pen?.forEach((p) =>
        statuses.set(p.peserta_id, { submitted: p.is_submitted, locked: p.is_locked })
      );
    }

    const result: PesertaWithStatus[] = pst.map((p) => {
      const s = statuses.get(p.id);
      return {
        ...p,
        is_submitted: s?.submitted ?? false,
        is_locked: s?.locked ?? false,
      };
    });

    setPeserta(result);
    setLoading(false);
  }

  if (loading) return <p className="text-slate-600">Memuat...</p>;

  return (
    <div className="space-y-4">
      <div>
        <Link
          href="/juri"
          className="mb-2 inline-flex items-center gap-1 text-sm text-slate-600 hover:text-slate-900"
        >
          <ArrowLeft className="h-4 w-4" />
          Kembali ke Daftar Event
        </Link>
        <h2 className="text-lg font-bold text-slate-900">{eventName}</h2>
        <p className="text-sm text-slate-600">Pilih peserta untuk dinilai</p>
      </div>

      {peserta.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center text-slate-600">
          Belum ada peserta di event ini
        </div>
      ) : (
        <div className="space-y-2">
          {peserta.map((p) => (
            <Link
              key={p.id}
              href={`/juri/events/${id}/peserta/${p.id}`}
              className="group flex items-center justify-between rounded-xl border border-slate-200 bg-white p-4 transition hover:border-blue-500"
            >
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100 font-mono text-sm font-bold text-slate-700">
                  #{p.nomor_urut}
                </span>
                <div>
                  <p className="font-semibold text-slate-900">{p.nama_regu}</p>
                  <StatusBadge submitted={p.is_submitted} locked={p.is_locked} />
                </div>
              </div>
              <ArrowRight className="h-5 w-5 text-slate-400 group-hover:text-blue-600" />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

function StatusBadge({ submitted, locked }: { submitted: boolean; locked: boolean }) {
  if (locked) {
    return (
      <span className="mt-0.5 inline-flex items-center gap-1 rounded bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
        <Lock className="h-3 w-3" />
        Terkunci
      </span>
    );
  }
  if (submitted) {
    return (
      <span className="mt-0.5 inline-flex items-center gap-1 rounded bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
        <CheckCircle2 className="h-3 w-3" />
        Submitted
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
