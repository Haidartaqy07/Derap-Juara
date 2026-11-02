import defaultRubric from '../app/data/ldwc2026/rubric.json';

export const LDWC_COMPONENT_KEYS = [
  'pbb',
  'dantonPbb',
  'variasi',
  'formasi',
  'dantonVarfor',
] as const;

export type LdwcComponent = (typeof LDWC_COMPONENT_KEYS)[number];
export type RubricLevel = keyof (typeof defaultRubric)['components']['pbb'][number]['levels'];

export interface RubricItem<C extends LdwcComponent = LdwcComponent> {
  component: C;
  itemId: number;
  name: string;
  max: number;
  levels: Partial<Record<RubricLevel, number>>;
}

export interface LdwcRubric {
  event: string;
  source: string;
  levelOrder: RubricLevel[];
  note: string;
  components: Record<LdwcComponent, Array<{
    itemId: number;
    name: string;
    max: number;
    levels: Partial<Record<RubricLevel, number>>;
  }>>;
}

export const LDWC_DEFAULT_RUBRIC = defaultRubric as LdwcRubric;
const defaultItems = Object.fromEntries(
  LDWC_COMPONENT_KEYS.map((component) => [
    component,
    defaultRubric.components[component].map((item) => ({ component, ...item })),
  ])
) as Record<LdwcComponent, RubricItem[]>;
export const LDWC_LEVEL_ORDER = defaultRubric.levelOrder as RubricLevel[];
export const LDWC_PBB_ITEMS = defaultItems.pbb;
export const LDWC_DANTON_PBB_ITEMS = defaultItems.dantonPbb;
export const LDWC_VARIASI_ITEMS = defaultItems.variasi;
export const LDWC_FORMASI_ITEMS = defaultItems.formasi;
export const LDWC_DANTON_VARFOR_ITEMS = defaultItems.dantonVarfor;
export const LDWC_ITEMS = defaultItems;
export const LDWC_MAXIMUMS = getLdwcMaximums(LDWC_DEFAULT_RUBRIC);

export function parseLdwcRubric(value: unknown): LdwcRubric {
  if (typeof value !== 'object' || value === null) {
    throw new TypeError('Rubrik event tidak valid.');
  }
  const raw = value as Partial<LdwcRubric>;
  if (
    typeof raw.event !== 'string' ||
    typeof raw.source !== 'string' ||
    !Array.isArray(raw.levelOrder) ||
    !raw.levelOrder.length ||
    new Set(raw.levelOrder).size !== raw.levelOrder.length ||
    typeof raw.components !== 'object' ||
    raw.components === null
  ) {
    throw new TypeError('Struktur rubrik event tidak lengkap.');
  }

  const allowedLevels = new Set(defaultRubric.levelOrder);
  if (
    raw.levelOrder.some(
      (level) => typeof level !== 'string' || !allowedLevels.has(level as RubricLevel)
    )
  ) {
    throw new TypeError('Rubrik event berisi tingkat nilai yang tidak dikenal.');
  }

  const components = {} as LdwcRubric['components'];
  const sharedScoreItemIds = new Set<number>();
  for (const component of LDWC_COMPONENT_KEYS) {
    const items = raw.components[component];
    if (!Array.isArray(items) || items.length === 0) {
      throw new TypeError(`Rubrik ${component} harus memiliki minimal satu item.`);
    }

    const ids = new Set<number>();
    components[component] = items.map((item: unknown) => {
      if (typeof item !== 'object' || item === null) {
        throw new TypeError(`Item rubrik ${component} tidak valid.`);
      }
      const rubricItem = item as LdwcRubric['components'][LdwcComponent][number];
      if (
        !Number.isSafeInteger(rubricItem.itemId) ||
        rubricItem.itemId < 1 ||
        ids.has(rubricItem.itemId) ||
        typeof rubricItem.name !== 'string' ||
        !rubricItem.name.trim() ||
        !Number.isFinite(rubricItem.max) ||
        rubricItem.max <= 0 ||
        typeof rubricItem.levels !== 'object' ||
        rubricItem.levels === null
      ) {
        throw new TypeError(`Item rubrik ${component} tidak valid.`);
      }
      ids.add(rubricItem.itemId);
      if (
        ['variasi', 'formasi', 'dantonVarfor'].includes(component) &&
        sharedScoreItemIds.has(rubricItem.itemId)
      ) {
        throw new TypeError(`Nomor item ${rubricItem.itemId} dipakai lebih dari sekali pada rubrik Variasi/Formasi.`);
      }
      if (['variasi', 'formasi', 'dantonVarfor'].includes(component)) {
        sharedScoreItemIds.add(rubricItem.itemId);
      }

      const levels: Partial<Record<RubricLevel, number>> = {};
      let hasLevel = false;
      for (const [level, score] of Object.entries(rubricItem.levels)) {
        if (!allowedLevels.has(level as RubricLevel)) {
          throw new TypeError(`Tingkat nilai "${level}" tidak dikenal.`);
        }
        if (!Number.isFinite(score) || score < 0 || score > rubricItem.max) {
          throw new TypeError(`Nilai ${level} pada ${rubricItem.name} harus antara 0 dan ${rubricItem.max}.`);
        }
        levels[level as RubricLevel] = score;
        hasLevel = true;
      }
      if (!hasLevel) throw new TypeError(`Item "${rubricItem.name}" harus memiliki tingkat nilai.`);

      return {
        itemId: rubricItem.itemId,
        name: rubricItem.name.trim(),
        max: rubricItem.max,
        levels,
      };
    });
  }

  return {
    event: raw.event,
    source: raw.source,
    levelOrder: [...raw.levelOrder],
    note: typeof raw.note === 'string' ? raw.note : '',
    components,
  };
}

export function getLdwcItems(rubric: LdwcRubric): Record<LdwcComponent, RubricItem[]> {
  return Object.fromEntries(
    LDWC_COMPONENT_KEYS.map((component) => [
      component,
      rubric.components[component].map((item) => ({ component, ...item })),
    ])
  ) as Record<LdwcComponent, RubricItem[]>;
}

export function getLdwcMaximums(rubric: LdwcRubric): Record<LdwcComponent, number> {
  const items = getLdwcItems(rubric);
  return Object.fromEntries(
    LDWC_COMPONENT_KEYS.map((component) => [
      component,
      items[component].reduce((total, item) => total + item.max, 0),
    ])
  ) as Record<LdwcComponent, number>;
}

export function rubricLevels(item: RubricItem, levelOrder: RubricLevel[]) {
  return levelOrder.flatMap((level) => {
    const value = item.levels[level];
    return value === undefined ? [] : [{ level, value }];
  });
}
