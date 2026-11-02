import type { RankingConfig } from '../scoring';

export const LOBB_UMUM: RankingConfig = {
  key: 'lobb-umum-test-only',
  useDeduction: true,
  rankByCategory: false,
  components: [
    { key: 'pbb', label: 'PBB', sources: ['pbb'], aggregate: 'sum', max: 1000, points: 600 },
    { key: 'variasiFormasi', label: 'Variasi Formasi', sources: ['variasiFormasi'], aggregate: 'sum', max: 1000, points: 300 },
    { key: 'danpas', label: 'Danpas', sources: ['danpas'], aggregate: 'sum', max: 200, points: 50 },
    { key: 'voting', label: 'Voting', sources: ['voting'], aggregate: 'sum', max: 1, points: 50 },
  ],
};

export const LOBB_UTAMA: RankingConfig = {
  key: 'lobb-utama-test-only',
  useDeduction: true,
  rankByCategory: false,
  components: [
    { key: 'pbb', label: 'PBB', sources: ['pbb'], aggregate: 'sum', max: 1000, points: 650 },
    { key: 'variasiFormasi', label: 'Variasi Formasi', sources: ['variasiFormasi'], aggregate: 'sum', max: 1000, points: 250 },
    { key: 'dantonPbb', label: 'Danpas PBB', sources: ['dantonPbb'], aggregate: 'sum', max: 100, points: 50 },
    { key: 'dantonVarfor', label: 'Danpas Variasi', sources: ['dantonVarfor'], aggregate: 'sum', max: 100, points: 50 },
  ],
};
