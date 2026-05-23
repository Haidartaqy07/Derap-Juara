'use client';

import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { RekapNilaiPeserta } from '@/types';
import {
  rankJuaraUmum,
  rankJuaraUtama,
  rankJuaraPbb,
  rankJuaraVarfor,
  rankJuaraDanton,
  formatWaktu,
} from '@/lib/scoring';
import { Trophy, Medal, Award, RefreshCw, CheckCircle2, Circle } from 'lucide-react';

type Kategori = 'umum' | 'utama' | 'pbb' | 'varfor' | 'danton';

// Format angka jadi poin dengan 1 desimal
function toPoint(n: number): string {
  return n.toFixed(1);
}

// Hitung poin per komponen sesuai rumus baru (poin = nilai_mentah × bobot)
// PBB & Danton PBB dibagi 2 (rata-rata 2 juri), VarFor & Danton VF tidak dibagi
function poinPbb60(p: RekapNilaiPeserta): number {
  return (p.nilai_pbb_total / 2) * 0.6;
}
function poinPbb65(p: RekapNilaiPeserta): number {
  return (p.nilai_pbb_total / 2) * 0.65;
}
function poinVarfor30(p: RekapNilaiPeserta): number {
  return p.nilai_varfor_total * 0.3;
}
function poinVarfor25(p: RekapNilaiPeserta): number {
  return p.nilai_varfor_total * 0.25;
}
function poinDantonUmum(p: RekapNilaiPeserta): number {
  // Danton PBB rata-rata 2 juri + Danton VarFor (juri 3 langsung), × 5%
  const dantonPbbAvg = p.nilai_danton_pbb_total / 2;
  return (dantonPbbAvg + p.nilai_danton_varfor_total) * 0.05;
}
function poinDantonPbb5(p: RekapNilaiPeserta): number {
  return (p.nilai_danton_pbb_total / 2) * 0.05;
}
function poinDantonVf5(p: RekapNilaiPeserta): number {
  return p.nilai_danton_varfor_total * 0.05;
}
function poinVoting5(p: RekapNilaiPeserta): number {
  // Voting tetap pakai persen (skala 0-100) karena tidak ada nilai mentah seragam
  return p.persen_voting * 0.05;
}
function skorJuaraUmumPoin(p: RekapNilaiPeserta): number {
  return poinPbb60(p) + poinVarfor30(p) + poinDantonUmum(p) + poinVoting5(p);
}
function skorJuaraUtamaPoin(p: RekapNilaiPeserta): number {
  return poinPbb65(p) + poinVarfor25(p) + poinDantonPbb5(p) + poinDantonVf5(p);
}

export default function PeringkatTab({
  eventId,
  batasWaktuDetik,
}: {
  eventId: string;
  batasWaktuDetik: number;
}) {
  const [rekap, setRekap] = useState<RekapNilaiPeserta[]>([]);
  const [kategori, setKategori] = useState<Kategori>('umum');
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  const loadRekap = useCallback(async () => {
    const supabase = createClient();
    const { data } = await supabase
      .from('rekap_nilai_peserta')
      .select('*')
      .eq('event_id', eventId)
      .order('nomor_urut');
    setRekap(data || []);
    setLastUpdate(new Date());
  }, [eventId]);

  useEffect(() => {
    loadRekap();

    // Subscribe ke realtime: setiap perubahan submission akan trigger reload
    const supabase = createClient();
    const channel = supabase
      .channel(`event-${eventId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'penilaian_pbb' },
        () => loadRekap()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'penilaian_varfor' },
        () => loadRekap()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'nilai_detail_pbb' },
        () => loadRekap()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'nilai_detail_varfor' },
        () => loadRekap()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'voting' },
        () => loadRekap()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'peserta' },
        () => loadRekap()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [eventId, loadRekap]);

  let sorted: RekapNilaiPeserta[] = [];
  if (kategori === 'umum') sorted = rankJuaraUmum(rekap);
  else if (kategori === 'utama') sorted = rankJuaraUtama(rekap);
  else if (kategori === 'pbb') sorted = rankJuaraPbb(rekap);
  else if (kategori === 'varfor') sorted = rankJuaraVarfor(rekap);
  else sorted = rankJuaraDanton(rekap, batasWaktuDetik);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap gap-2">
          <KatBtn aktif={kategori === 'umum'} onClick={() => setKategori('umum')}>
            Juara Umum
          </KatBtn>
          <KatBtn aktif={kategori === 'utama'} onClick={() => setKategori('utama')}>
            Juara Utama - Terakhir
          </KatBtn>
          <KatBtn aktif={kategori === 'pbb'} onClick={() => setKategori('pbb')}>
            PBB Terbaik
          </KatBtn>
          <KatBtn aktif={kategori === 'varfor'} onClick={() => setKategori('varfor')}>
            Variasi Formasi Terbaik
          </KatBtn>
          <KatBtn aktif={kategori === 'danton'} onClick={() => setKategori('danton')}>
            Danton Terbaik
          </KatBtn>
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <span className="flex h-2 w-2 animate-pulse rounded-full bg-green-500"></span>
          Live • Update: {lastUpdate.toLocaleTimeString('id-ID')}
          <button
            onClick={loadRekap}
            className="ml-1 rounded p-1 hover:bg-slate-100"
            aria-label="Refresh"
          >
            <RefreshCw className="h-3 w-3" />
          </button>
        </div>
      </div>

      {rekap.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center text-slate-600">
          Belum ada peserta. Tambahkan peserta dulu di tab Peserta.
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <table className="w-full">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-3 py-2 text-left text-xs font-semibold text-slate-600">Rank</th>
                <th className="px-3 py-2 text-left text-xs font-semibold text-slate-600">Regu</th>
                <th className="px-3 py-2 text-left text-xs font-semibold text-slate-600">Status</th>
                {kategori === 'umum' && (
                  <>
                    <th className="px-3 py-2 text-right text-xs font-semibold text-slate-600">
                      PBB 60%
                    </th>
                    <th className="px-3 py-2 text-right text-xs font-semibold text-slate-600">
                      VarFor 30%
                    </th>
                    <th className="px-3 py-2 text-right text-xs font-semibold text-slate-600">
                      Danton 5%
                    </th>
                    <th className="px-3 py-2 text-right text-xs font-semibold text-slate-600">
                      Voting 5%
                    </th>
                    <th className="px-3 py-2 text-right text-xs font-bold text-blue-700">SKOR</th>
                  </>
                )}
                {kategori === 'utama' && (
                  <>
                    <th className="px-3 py-2 text-right text-xs font-semibold text-slate-600">
                      PBB 65%
                    </th>
                    <th className="px-3 py-2 text-right text-xs font-semibold text-slate-600">
                      VarFor 25%
                    </th>
                    <th className="px-3 py-2 text-right text-xs font-semibold text-slate-600">
                      Dnt PBB 5%
                    </th>
                    <th className="px-3 py-2 text-right text-xs font-semibold text-slate-600">
                      Dnt VF 5%
                    </th>
                    <th className="px-3 py-2 text-right text-xs font-bold text-blue-700">SKOR</th>
                  </>
                )}
                {kategori === 'pbb' && (
                  <>
                    <th className="px-3 py-2 text-right text-xs font-semibold text-slate-600">
                      Nilai PBB
                    </th>
                    <th className="px-3 py-2 text-right text-xs font-semibold text-slate-600">
                      Jalan (tie-break)
                    </th>
                  </>
                )}
                {kategori === 'varfor' && (
                  <>
                    <th className="px-3 py-2 text-right text-xs font-semibold text-slate-600">
                      Nilai VarFor
                    </th>
                    <th className="px-3 py-2 text-right text-xs font-semibold text-slate-600">
                      Formasi (tie-break)
                    </th>
                  </>
                )}
                {kategori === 'danton' && (
                  <>
                    <th className="px-3 py-2 text-right text-xs font-semibold text-slate-600">
                      Danton PBB
                    </th>
                    <th className="px-3 py-2 text-right text-xs font-semibold text-slate-600">
                      Danton VF
                    </th>
                    <th className="px-3 py-2 text-right text-xs font-semibold text-slate-600">
                      Total
                    </th>
                    <th className="px-3 py-2 text-right text-xs font-semibold text-slate-600">
                      Waktu
                    </th>
                  </>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {sorted.map((p, i) => (
                <tr key={p.peserta_id} className={i < 3 ? 'bg-amber-50/40' : ''}>
                  <td className="px-3 py-3">
                    <RankBadge rank={i + 1} />
                  </td>
                  <td className="px-3 py-3">
                    <div className="font-semibold text-slate-900">{p.nama_regu}</div>
                    <div className="text-xs text-slate-500">No urut #{p.nomor_urut}</div>
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex gap-1">
                      <StatusDot ok={p.juri1_submitted} label="J1" />
                      <StatusDot ok={p.juri2_submitted} label="J2" />
                      <StatusDot ok={p.juri3_submitted} label="J3" />
                    </div>
                  </td>

                  {kategori === 'umum' && (
                    <>
                      <td className="px-3 py-3 text-right font-mono text-sm">{toPoint(poinPbb60(p))}</td>
                      <td className="px-3 py-3 text-right font-mono text-sm">{toPoint(poinVarfor30(p))}</td>
                      <td className="px-3 py-3 text-right font-mono text-sm">{toPoint(poinDantonUmum(p))}</td>
                      <td className="px-3 py-3 text-right font-mono text-sm">{toPoint(poinVoting5(p))}</td>
                      <td className="px-3 py-3 text-right font-mono text-base font-bold text-blue-700">
                        {toPoint(skorJuaraUmumPoin(p))}
                      </td>
                    </>
                  )}

                  {kategori === 'utama' && (
                    <>
                      <td className="px-3 py-3 text-right font-mono text-sm">{toPoint(poinPbb65(p))}</td>
                      <td className="px-3 py-3 text-right font-mono text-sm">{toPoint(poinVarfor25(p))}</td>
                      <td className="px-3 py-3 text-right font-mono text-sm">{toPoint(poinDantonPbb5(p))}</td>
                      <td className="px-3 py-3 text-right font-mono text-sm">{toPoint(poinDantonVf5(p))}</td>
                      <td className="px-3 py-3 text-right font-mono text-base font-bold text-blue-700">
                        {toPoint(skorJuaraUtamaPoin(p))}
                      </td>
                    </>
                  )}

                  {kategori === 'pbb' && (
                    <>
                      <td className="px-3 py-3 text-right font-mono text-base font-bold text-blue-700">
                        {toPoint(p.nilai_pbb_total)}
                      </td>
                      <td className="px-3 py-3 text-right font-mono text-sm text-slate-600">
                        {toPoint(p.nilai_gerakan_jalan)}
                      </td>
                    </>
                  )}

                  {kategori === 'varfor' && (
                    <>
                      <td className="px-3 py-3 text-right font-mono text-base font-bold text-blue-700">
                        {toPoint(p.nilai_varfor_total)}
                      </td>
                      <td className="px-3 py-3 text-right font-mono text-sm text-slate-600">
                        {toPoint(p.nilai_formasi_only)}
                      </td>
                    </>
                  )}

                  {kategori === 'danton' && (
                    <>
                      <td className="px-3 py-3 text-right font-mono text-sm">
                        {toPoint(p.nilai_danton_pbb_total)}
                      </td>
                      <td className="px-3 py-3 text-right font-mono text-sm">
                        {toPoint(p.nilai_danton_varfor_total)}
                      </td>
                      <td className="px-3 py-3 text-right font-mono text-base font-bold text-blue-700">
                        {toPoint(p.nilai_danton_pbb_total + p.nilai_danton_varfor_total)}
                      </td>
                      <td className="px-3 py-3 text-right font-mono text-sm text-slate-600">
                        {formatWaktu(p.waktu_tampil_detik)}
                      </td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function KatBtn({
  aktif,
  onClick,
  children,
}: {
  aktif: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-medium transition ${
        aktif ? 'bg-blue-600 text-white' : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
      }`}
    >
      {children}
    </button>
  );
}

function RankBadge({ rank }: { rank: number }) {
  if (rank === 1)
    return (
      <div className="flex items-center gap-1.5">
        <Trophy className="h-5 w-5 text-amber-500" />
        <span className="font-bold text-amber-700">1</span>
      </div>
    );
  if (rank === 2)
    return (
      <div className="flex items-center gap-1.5">
        <Medal className="h-5 w-5 text-slate-400" />
        <span className="font-bold text-slate-700">2</span>
      </div>
    );
  if (rank === 3)
    return (
      <div className="flex items-center gap-1.5">
        <Award className="h-5 w-5 text-orange-600" />
        <span className="font-bold text-orange-700">3</span>
      </div>
    );
  return <span className="ml-1 font-mono text-sm text-slate-500">#{rank}</span>;
}

function StatusDot({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span
      title={`${label}: ${ok ? 'Submitted' : 'Belum'}`}
      className={`inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-xs font-medium ${
        ok ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'
      }`}
    >
      {ok ? <CheckCircle2 className="h-3 w-3" /> : <Circle className="h-3 w-3" />}
      {label}
    </span>
  );
}