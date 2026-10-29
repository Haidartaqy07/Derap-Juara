import type { RekapNilaiPeserta } from '../types';

export interface ComponentConfig {
  key: string;
  sources: string[];
  aggregate: 'sum' | 'avg';
  max: number;
  points: number;
}

export interface RankingConfig {
  key: string;
  components: ComponentConfig[];
  requiredSubmissions: string[];
  deduction: boolean;
}

export interface ParticipantScoringData {
  scores: Record<string, number>;
  submissions: Record<string, boolean>;
  deduction: number;
}

export interface RankingResult {
  complete: boolean;
  components: Record<string, number | null>;
  total: number | null;
}

export interface BestCategoryScores {
  id: string;
  pbb: number;
  varfor: number;
  danpas: number;
}

export const LOBB_2026_UTAMA: RankingConfig = {
  key: 'juara-utama',
  components: [
    { key: 'pbb', sources: ['pbb'], aggregate: 'sum', max: 1000, points: 650 },
    { key: 'varfor', sources: ['varfor'], aggregate: 'sum', max: 1000, points: 250 },
    { key: 'danpasPbb', sources: ['danpasPbb'], aggregate: 'sum', max: 100, points: 50 },
    { key: 'danpasVarfor', sources: ['danpasVarfor'], aggregate: 'sum', max: 100, points: 50 },
  ],
  requiredSubmissions: ['juri1', 'juri2', 'juri3'],
  deduction: true,
};

export const LOBB_2026_UMUM: RankingConfig = {
  key: 'juara-umum',
  components: [
    { key: 'pbb', sources: ['pbb'], aggregate: 'sum', max: 1000, points: 600 },
    { key: 'varfor', sources: ['varfor'], aggregate: 'sum', max: 1000, points: 300 },
    {
      key: 'danpas',
      sources: ['danpasPbb', 'danpasVarfor'],
      aggregate: 'sum',
      max: 200,
      points: 50,
    },
    { key: 'voting', sources: ['voting'], aggregate: 'sum', max: 1, points: 50 },
  ],
  requiredSubmissions: ['juri1', 'juri2', 'juri3'],
  deduction: true,
};

export function aggregateComponent(
  config: ComponentConfig,
  scores: Record<string, number>
): number {
  if (config.sources.length === 0 || !Number.isFinite(config.max) || config.max <= 0) {
    throw new RangeError(`Konfigurasi komponen ${config.key} tidak valid.`);
  }
  if (!Number.isFinite(config.points) || config.points < 0) {
    throw new RangeError(`Bobot komponen ${config.key} tidak valid.`);
  }

  const values = config.sources.map((source) => scores[source]);
  if (values.some((value) => !Number.isFinite(value))) {
    throw new TypeError(`Nilai sumber komponen ${config.key} tidak lengkap atau tidak valid.`);
  }
  const raw =
    config.aggregate === 'avg'
      ? values.reduce((total, value) => total + value, 0) / values.length
      : values.reduce((total, value) => total + value, 0);

  return (raw / config.max) * config.points;
}

export function computeRanking(
  config: RankingConfig,
  participant: ParticipantScoringData
): RankingResult {
  const complete = config.requiredSubmissions.every(
    (submission) => participant.submissions[submission] === true
  );
  const components: Record<string, number | null> = {};

  for (const component of config.components) {
    const hasSources = component.sources.every((source) =>
      Number.isFinite(participant.scores[source])
    );
    components[component.key] = hasSources
      ? aggregateComponent(component, participant.scores)
      : null;
  }

  if (!complete) return { complete: false, components, total: null };
  if (!Number.isFinite(participant.deduction) || participant.deduction < 0) {
    throw new RangeError('Pengurangan harus berupa angka non-negatif.');
  }
  if (Object.values(components).some((value) => value === null)) {
    throw new TypeError(`Nilai komponen konfigurasi ${config.key} tidak lengkap.`);
  }

  const total = Object.values(components).reduce<number>(
    (sum, value) => sum + (value ?? 0),
    0
  );
  return {
    complete: true,
    components,
    total: total - (config.deduction ? participant.deduction : 0),
  };
}

export function getLobbScoringData(
  participant: RekapNilaiPeserta
): ParticipantScoringData {
  return {
    scores: {
      pbb: participant.nilai_pbb_total / 2,
      varfor: participant.nilai_varfor_total,
      danpasPbb: participant.nilai_danton_pbb_total / 2,
      danpasVarfor: participant.nilai_danton_varfor_total,
      voting: participant.voting_raw,
    },
    submissions: {
      juri1: participant.juri1_submitted,
      juri2: participant.juri2_submitted,
      juri3: participant.juri3_submitted,
    },
    deduction: participant.total_penalti_poin,
  };
}

export function computeLobbRankings(participant: RekapNilaiPeserta) {
  const data = getLobbScoringData(participant);
  return {
    umum: computeRanking(LOBB_2026_UMUM, data),
    utama: computeRanking(LOBB_2026_UTAMA, data),
  };
}

export function computeBestCategories<T extends BestCategoryScores>(participants: T[]) {
  const sortBy = (score: 'pbb' | 'varfor' | 'danpas') =>
    [...participants].sort((a, b) => b[score] - a[score]);

  return {
    pbb: sortBy('pbb'),
    varfor: sortBy('varfor'),
    danpas: sortBy('danpas'),
  };
}

export function rankJuaraUtama(data: RekapNilaiPeserta[]): RekapNilaiPeserta[] {
  return [...data].sort((a, b) => {
    const scoreA = computeLobbRankings(a).utama.total;
    const scoreB = computeLobbRankings(b).utama.total;
    if (scoreA === null && scoreB !== null) return 1;
    if (scoreB === null && scoreA !== null) return -1;
    if (scoreA !== scoreB) return (scoreB ?? 0) - (scoreA ?? 0);
    return b.nilai_pbb_total - a.nilai_pbb_total;
  });
}

export function rankJuaraUmum(data: RekapNilaiPeserta[]): RekapNilaiPeserta[] {
  return [...data].sort((a, b) => {
    const scoreA = computeLobbRankings(a).umum.total;
    const scoreB = computeLobbRankings(b).umum.total;
    if (scoreA === null && scoreB !== null) return 1;
    if (scoreB === null && scoreA !== null) return -1;
    return (scoreB ?? 0) - (scoreA ?? 0);
  });
}

/**
 * Juara PBB Terbaik
 * Tie-breaker: Total nilai gerakan jalan tertinggi
 */
export function rankJuaraPbb(data: RekapNilaiPeserta[]): RekapNilaiPeserta[] {
  return [...data].sort((a, b) => {
    const completeA = a.juri1_submitted && a.juri2_submitted;
    const completeB = b.juri1_submitted && b.juri2_submitted;
    if (completeA !== completeB) return completeB ? 1 : -1;
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
    if (a.juri3_submitted !== b.juri3_submitted) return b.juri3_submitted ? 1 : -1;
    if (b.nilai_varfor_total !== a.nilai_varfor_total) {
      return b.nilai_varfor_total - a.nilai_varfor_total;
    }
    return b.nilai_formasi_only - a.nilai_formasi_only;
  });
}

/**
 * Juara Danton Terbaik
 * Nilai Danton = Danton PBB + Danton VarFor
 */
export function rankJuaraDanton(
  data: RekapNilaiPeserta[],
  batasWaktuDetik: number
): RekapNilaiPeserta[] {
  return [...data].sort((a, b) => {
    const completeA = isPenilaianLengkap(a);
    const completeB = isPenilaianLengkap(b);
    if (completeA !== completeB) return completeB ? 1 : -1;
    const totalDantonA = a.nilai_danton_pbb_total + a.nilai_danton_varfor_total;
    const totalDantonB = b.nilai_danton_pbb_total + b.nilai_danton_varfor_total;
    if (totalDantonB !== totalDantonA) return totalDantonB - totalDantonA;

    const jarakA =
      a.waktu_tampil_detik !== null ? Math.abs(batasWaktuDetik - a.waktu_tampil_detik) : Infinity;
    const jarakB =
      b.waktu_tampil_detik !== null ? Math.abs(batasWaktuDetik - b.waktu_tampil_detik) : Infinity;
    return jarakA - jarakB;
  });
}

export function formatWaktu(detik: number | null | undefined): string {
  if (detik === null || detik === undefined) return '-';
  const m = Math.floor(detik / 60);
  const s = detik % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export function isPenilaianLengkap(p: RekapNilaiPeserta): boolean {
  return p.juri1_submitted && p.juri2_submitted && p.juri3_submitted;
}
