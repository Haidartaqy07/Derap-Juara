import { getLdwcMaximums, LDWC_DEFAULT_RUBRIC } from './ldwc-rubric';
import type { RubricItem } from './ldwc-rubric';

const LDWC_DEFAULT_MAXIMUMS = getLdwcMaximums(LDWC_DEFAULT_RUBRIC);

export interface SubmissionScore {
  itemId: number;
  value: number;
}

export interface ComponentConfig {
  key: string;
  label: string;
  sources: string[];
  aggregate: 'sum' | 'avg';
  max: number;
  points: number | null;
}

export interface RankingConfig {
  key: string;
  components: ComponentConfig[];
  useDeduction: boolean;
  rankByCategory: boolean;
}

export const LDWC_2026_CONFIG: RankingConfig = {
  key: 'ldwc-2026',
  components: [
    { key: 'pbb', label: 'PBB', sources: ['pbb'], aggregate: 'sum', max: LDWC_DEFAULT_MAXIMUMS.pbb, points: null },
    { key: 'variasi', label: 'Variasi', sources: ['variasi'], aggregate: 'sum', max: LDWC_DEFAULT_MAXIMUMS.variasi, points: null },
    { key: 'formasi', label: 'Formasi', sources: ['formasi'], aggregate: 'sum', max: LDWC_DEFAULT_MAXIMUMS.formasi, points: null },
    { key: 'dantonPbb', label: 'Danton PBB', sources: ['dantonPbb'], aggregate: 'sum', max: LDWC_DEFAULT_MAXIMUMS.dantonPbb, points: null },
    { key: 'dantonVarfor', label: 'Danton Variasi & Formasi', sources: ['dantonVarfor'], aggregate: 'sum', max: LDWC_DEFAULT_MAXIMUMS.dantonVarfor, points: null },
  ],
  useDeduction: false,
  rankByCategory: false,
};

export function isConfigured(config: RankingConfig): boolean {
  return (
    config.components.length > 0 &&
    config.components.every(
      (component) =>
        component.sources.length > 0 &&
        Number.isFinite(component.points) &&
        component.points !== null &&
        component.points >= 0 &&
        Number.isFinite(component.max) &&
        component.max > 0
    )
  );
}

export function sumItems(scores: readonly SubmissionScore[], itemIds?: readonly number[]): number {
  const scoreById = new Map<number, number>();
  for (const score of scores) {
    if (!Number.isInteger(score.itemId) || !Number.isFinite(score.value)) {
      throw new TypeError('Skor item tidak valid.');
    }
    if (scoreById.has(score.itemId)) {
      throw new TypeError(`Skor item ${score.itemId} tercatat lebih dari sekali.`);
    }
    scoreById.set(score.itemId, score.value);
  }

  const values = itemIds
    ? itemIds.map((itemId) => scoreById.get(itemId) ?? 0)
    : Array.from(scoreById.values());
  return values.reduce((total, value) => total + value, 0);
}

export function averageTotals(totals: readonly (number | null | undefined)[]): number | null {
  if (totals.length === 0 || totals.some((total) => total == null || !Number.isFinite(total))) {
    return null;
  }
  return totals.reduce<number>((sum, total) => sum + (total ?? 0), 0) / totals.length;
}

export function computeRaw(
  items: readonly RubricItem[],
  scores: readonly SubmissionScore[] | null | undefined,
  submitted: boolean
): number | null {
  if (!submitted || !scores) return null;
  const expectedItems = new Map(items.map((item) => [item.itemId, item]));
  const scoreById = new Map<number, number>();
  for (const score of scores) {
    const item = expectedItems.get(score.itemId);
    if (!item || !Number.isFinite(score.value) || scoreById.has(score.itemId)) return null;
    if (!Object.values(item.levels).includes(score.value)) return null;
    scoreById.set(score.itemId, score.value);
  }
  if (scoreById.size !== items.length || items.some((item) => !scoreById.has(item.itemId))) return null;
  return sumItems(scores, items.map(({ itemId }) => itemId));
}

export function computeRawFromSharedScores(
  items: readonly RubricItem[],
  scores: readonly SubmissionScore[] | null | undefined,
  submitted: boolean
): number | null {
  const itemIds = new Set(items.map(({ itemId }) => itemId));
  const componentScores = scores?.filter(({ itemId }) => itemIds.has(itemId));
  return computeRaw(items, componentScores, submitted);
}

export function combine(
  config: RankingConfig,
  scores: Record<string, number | null | undefined>,
  deduction = 0
): number | null {
  if (!isConfigured(config)) return null;
  if (!Number.isFinite(deduction) || deduction < 0) {
    throw new RangeError('Pengurangan harus berupa angka non-negatif.');
  }

  let total = 0;
  for (const component of config.components) {
    const values: number[] = [];
    for (const source of component.sources) {
      const value = scores[source];
      if (value == null || !Number.isFinite(value)) return null;
      values.push(value);
    }
    const raw =
      component.aggregate === 'avg'
        ? values.reduce((sum, value) => sum + value, 0) / values.length
        : values.reduce((sum, value) => sum + value, 0);
    total += (raw / component.max) * (component.points ?? 0);
  }

  return total - (config.useDeduction ? deduction : 0);
}
