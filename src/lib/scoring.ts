import { RekapNilaiPeserta } from '@/types';

/**
 * Hitung peringkat Juara Utama-Terakhir
 * Sort by skor BERSIH (skor utama poin − penalti waktu otomatis − penalti manual)
 * Tie-breaker: Nilai PBB tertinggi
 */
export function rankJuaraUtama(data: RekapNilaiPeserta[]): RekapNilaiPeserta[] {
  return [...data].sort((a, b) => {
    if (b.skor_juara_utama_bersih !== a.skor_juara_utama_bersih) {
      return b.skor_juara_utama_bersih - a.skor_juara_utama_bersih;
    }
    return b.nilai_pbb_total - a.nilai_pbb_total; // tie-breaker
  });
}

/**
 * Hitung peringkat Juara Umum
 */
export function rankJuaraUmum(data: RekapNilaiPeserta[]): RekapNilaiPeserta[] {
  return [...data].sort((a, b) => b.skor_juara_umum - a.skor_juara_umum);
}

/**
 * Juara PBB Terbaik
 * Tie-breaker: Total nilai gerakan jalan tertinggi
 */
export function rankJuaraPbb(data: RekapNilaiPeserta[]): RekapNilaiPeserta[] {
  return [...data].sort((a, b) => {
    if (b.nilai_pbb_total !== a.nilai_pbb_total) {
      return b.nilai_pbb_total - a.nilai_pbb_total;
    }
    return b.nilai_gerakan_jalan - a.nilai_gerakan_jalan;
  });
}

/**
 * Juara Variasi Formasi Terbaik
 * Tie-breaker: Total nilai Formasi tertinggi (V9-V18)
 */
export function rankJuaraVarfor(data: RekapNilaiPeserta[]): RekapNilaiPeserta[] {
  return [...data].sort((a, b) => {
    if (b.nilai_varfor_total !== a.nilai_varfor_total) {
      return b.nilai_varfor_total - a.nilai_varfor_total;
    }
    return b.nilai_formasi_only - a.nilai_formasi_only;
  });
}

/**
 * Juara Danton Terbaik
 * Nilai Danton = Danton PBB + Danton VarFor
 * Tie-breaker: Waktu penampilan paling mendekati batas maks (asumsi batas didapat dari event)
 */
export function rankJuaraDanton(
  data: RekapNilaiPeserta[],
  batasWaktuDetik: number
): RekapNilaiPeserta[] {
  return [...data].sort((a, b) => {
    const totalDantonA = a.nilai_danton_pbb_total + a.nilai_danton_varfor_total;
    const totalDantonB = b.nilai_danton_pbb_total + b.nilai_danton_varfor_total;

    if (totalDantonB !== totalDantonA) return totalDantonB - totalDantonA;

    // Tie-breaker: jarak waktu ke batas maks (semakin kecil semakin baik)
    const jarakA = a.waktu_tampil_detik !== null ? Math.abs(batasWaktuDetik - a.waktu_tampil_detik) : Infinity;
    const jarakB = b.waktu_tampil_detik !== null ? Math.abs(batasWaktuDetik - b.waktu_tampil_detik) : Infinity;
    return jarakA - jarakB;
  });
}

/**
 * Format waktu detik ke string MM:SS
 */
export function formatWaktu(detik: number | null | undefined): string {
  if (detik === null || detik === undefined) return '-';
  const m = Math.floor(detik / 60);
  const s = detik % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

/**
 * Cek kelengkapan penilaian peserta
 */
export function isPenilaianLengkap(p: RekapNilaiPeserta): boolean {
  return p.juri1_submitted && p.juri2_submitted && p.juri3_submitted;
}