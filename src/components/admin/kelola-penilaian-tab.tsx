'use client';

import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Lock, Unlock, CheckCircle2, Circle } from 'lucide-react';

type StatusRow = {
  peserta_id: string;
  nama_regu: string;
  nomor_urut: number;
  juri1_id: string | null;
  juri1_submitted: boolean;
  juri1_locked: boolean;
  juri2_id: string | null;
  juri2_submitted: boolean;
  juri2_locked: boolean;
  juri3_id: string | null;
  juri3_submitted: boolean;
  juri3_locked: boolean;
};

export default function KelolaPenilaianTab({ eventId }: { eventId: string }) {
  const [rows, setRows] = useState<StatusRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const supabase = createClient();

    const { data: peserta } = await supabase
      .from('peserta')
      .select('*')
      .eq('event_id', eventId)
      .order('nomor_urut');

    if (!peserta) {
      setRows([]);
      setLoading(false);
      return;
    }

    const pesertaIds = peserta.map((p) => p.id);

    const { data: pbb } = await supabase
      .from('penilaian_pbb')
      .select('*')
      .in('peserta_id', pesertaIds);

    const { data: varfor } = await supabase
      .from('penilaian_varfor')
      .select('*')
      .in('peserta_id', pesertaIds);

    const result: StatusRow[] = peserta.map((p) => {
      const j1 = pbb?.find((x) => x.peserta_id === p.id && x.tipe_juri === 'juri1');
      const j2 = pbb?.find((x) => x.peserta_id === p.id && x.tipe_juri === 'juri2');
      const j3 = varfor?.find((x) => x.peserta_id === p.id);
      return {
        peserta_id: p.id,
        nama_regu: p.nama_regu,
        nomor_urut: p.nomor_urut,
        juri1_id: j1?.id ?? null,
        juri1_submitted: j1?.is_submitted ?? false,
        juri1_locked: j1?.is_locked ?? false,
        juri2_id: j2?.id ?? null,
        juri2_submitted: j2?.is_submitted ?? false,
        juri2_locked: j2?.is_locked ?? false,
        juri3_id: j3?.id ?? null,
        juri3_submitted: j3?.is_submitted ?? false,
        juri3_locked: j3?.is_locked ?? false,
      };
    });

    setRows(result);
    setLoading(false);
  }, [eventId]);

  useEffect(() => {
    load();
  }, [load]);

  async function toggleLock(
    table: 'penilaian_pbb' | 'penilaian_varfor',
    id: string,
    currentLocked: boolean
  ) {
    if (currentLocked && !confirm('Buka kunci penilaian? Juri akan bisa edit nilainya kembali.')) return;

    const supabase = createClient();
    const { error } = await supabase.from(table).update({ is_locked: !currentLocked }).eq('id', id);

    if (error) alert('Gagal: ' + error.message);
    await load();
  }

  if (loading) return <p className="text-slate-600">Memuat...</p>;

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
        <p className="font-medium">Buka kunci untuk revisi</p>
        <p className="mt-1 text-amber-800">
          Setelah juri klik submit, nilai akan terkunci otomatis. Buka kunci di sini jika ada juri
          yang perlu merevisi nilainya.
        </p>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <table className="w-full">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-3 py-2 text-left text-xs font-semibold text-slate-600">No</th>
              <th className="px-3 py-2 text-left text-xs font-semibold text-slate-600">Regu</th>
              <th className="px-3 py-2 text-center text-xs font-semibold text-slate-600">
                Juri 1 (PBB)
              </th>
              <th className="px-3 py-2 text-center text-xs font-semibold text-slate-600">
                Juri 2 (PBB)
              </th>
              <th className="px-3 py-2 text-center text-xs font-semibold text-slate-600">
                Juri 3 (VarFor)
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {rows.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-sm text-slate-500">
                  Belum ada peserta
                </td>
              </tr>
            ) : (
              rows.map((r) => (
                <tr key={r.peserta_id}>
                  <td className="px-3 py-3 font-mono text-sm">#{r.nomor_urut}</td>
                  <td className="px-3 py-3 text-sm font-medium">{r.nama_regu}</td>
                  <StatusCell
                    submitted={r.juri1_submitted}
                    locked={r.juri1_locked}
                    onToggle={
                      r.juri1_id
                        ? () => toggleLock('penilaian_pbb', r.juri1_id!, r.juri1_locked)
                        : undefined
                    }
                  />
                  <StatusCell
                    submitted={r.juri2_submitted}
                    locked={r.juri2_locked}
                    onToggle={
                      r.juri2_id
                        ? () => toggleLock('penilaian_pbb', r.juri2_id!, r.juri2_locked)
                        : undefined
                    }
                  />
                  <StatusCell
                    submitted={r.juri3_submitted}
                    locked={r.juri3_locked}
                    onToggle={
                      r.juri3_id
                        ? () => toggleLock('penilaian_varfor', r.juri3_id!, r.juri3_locked)
                        : undefined
                    }
                  />
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
  submitted,
  locked,
  onToggle,
}: {
  submitted: boolean;
  locked: boolean;
  onToggle?: () => void;
}) {
  if (!submitted) {
    return (
      <td className="px-3 py-3 text-center">
        <span className="inline-flex items-center gap-1 rounded px-2 py-0.5 text-xs text-slate-500">
          <Circle className="h-3 w-3" />
          Belum
        </span>
      </td>
    );
  }
  return (
    <td className="px-3 py-3 text-center">
      <div className="flex flex-col items-center gap-1">
        <span className="inline-flex items-center gap-1 rounded bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
          <CheckCircle2 className="h-3 w-3" />
          Submitted
        </span>
        {onToggle && (
          <button
            onClick={onToggle}
            className={`inline-flex items-center gap-1 rounded px-2 py-0.5 text-xs font-medium transition ${
              locked
                ? 'bg-red-100 text-red-700 hover:bg-red-200'
                : 'bg-amber-100 text-amber-700 hover:bg-amber-200'
            }`}
          >
            {locked ? (
              <>
                <Lock className="h-3 w-3" />
                Terkunci • Buka
              </>
            ) : (
              <>
                <Unlock className="h-3 w-3" />
                Terbuka
              </>
            )}
          </button>
        )}
      </div>
    </td>
  );
}
