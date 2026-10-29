import { describe, expect, it } from 'vitest';
import {
  aggregateComponent,
  computeBestCategories,
  computeRanking,
  LOBB_2026_UMUM,
  LOBB_2026_UTAMA,
  type ParticipantScoringData,
} from './scoring';

const sampleScores: ParticipantScoringData = {
  scores: {
    pbb: 710.5,
    varfor: 535,
    danpasPbb: 72,
    danpasVarfor: 78,
    voting: 0.0046,
  },
  submissions: { juri1: true, juri2: true, juri3: true },
  deduction: 0,
};

describe('scoring', () => {
  it('uses the LOBB Juara Umum raw-score formula', () => {
    expect(computeRanking(LOBB_2026_UMUM, sampleScores).total).toBeCloseTo(624.53, 8);
  });

  it('uses the LOBB Juara Utama raw-score formula', () => {
    expect(computeRanking(LOBB_2026_UTAMA, sampleScores).total).toBeCloseTo(670.575, 8);
  });

  it('subtracts deductions from both ranking totals', () => {
    const penalized = { ...sampleScores, deduction: 500 };

    expect(computeRanking(LOBB_2026_UMUM, penalized).total).toBeCloseTo(124.53, 8);
    expect(computeRanking(LOBB_2026_UTAMA, penalized).total).toBeCloseTo(170.575, 8);
  });

  it('does not return a total before every required judge submits', () => {
    const incomplete = {
      ...sampleScores,
      submissions: { ...sampleScores.submissions, juri2: false },
    };

    expect(computeRanking(LOBB_2026_UMUM, incomplete)).toMatchObject({
      complete: false,
      total: null,
    });
  });

  it('aggregates fixed-maximum components using their configured points', () => {
    expect(
      aggregateComponent(
        { key: 'pbb', sources: ['juri1', 'juri2'], aggregate: 'avg', max: 1000, points: 650 },
        { juri1: 700, juri2: 721 }
      )
    ).toBeCloseTo(461.825, 8);
  });

  it('ranks best-category raw scores independently', () => {
    const best = computeBestCategories([
      { id: 'one', pbb: 700, varfor: 500, danpas: 120 },
      { id: 'two', pbb: 710, varfor: 490, danpas: 140 },
    ]);

    expect(best.pbb.map(({ id }) => id)).toEqual(['two', 'one']);
    expect(best.varfor.map(({ id }) => id)).toEqual(['one', 'two']);
    expect(best.danpas.map(({ id }) => id)).toEqual(['two', 'one']);
  });
});
