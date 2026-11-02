import { describe, expect, it } from 'vitest';
import fixture from './__tests__/fixtures/lobb2026.json';
import { LOBB_UMUM, LOBB_UTAMA } from './__tests__/lobbTestConfig';
import {
  averageTotals,
  combine,
  computeRaw,
  computeRawFromSharedScores,
  isConfigured,
  LDWC_2026_CONFIG,
  sumItems,
} from './scoring';
import {
  getLdwcItems,
  getLdwcMaximums,
  LDWC_DEFAULT_RUBRIC,
  LDWC_DANTON_PBB_ITEMS,
  LDWC_DANTON_VARFOR_ITEMS,
  LDWC_FORMASI_ITEMS,
  LDWC_LEVEL_ORDER,
  LDWC_PBB_ITEMS,
  LDWC_VARIASI_ITEMS,
  parseLdwcRubric,
} from './ldwc-rubric';

describe('mesin hitung (fixture LOBB untuk regresi)', () => {
  it.each(fixture.regu)('regu $nomorUrut $nama', ({ raw, expected }) => {
    const umum = combine(
      LOBB_UMUM,
      {
        pbb: raw.pbb,
        variasiFormasi: raw.variasiFormasi,
        danpas: raw.danpasPbb + raw.danpasVarfor,
        voting: raw.voting,
      },
      raw.pengurangan
    );
    const utama = combine(
      LOBB_UTAMA,
      {
        pbb: raw.pbb,
        variasiFormasi: raw.variasiFormasi,
        dantonPbb: raw.danpasPbb,
        dantonVarfor: raw.danpasVarfor,
      },
      raw.pengurangan
    );

    expect(umum).toBeCloseTo(expected.juaraUmum, 2);
    expect(utama).toBeCloseTo(expected.juaraUtama, 2);
  });
});

describe('rubrik LDWC 2026', () => {
  it('uses the rubric item counts, ids and maximum subtotals', () => {
    expect(LDWC_PBB_ITEMS).toHaveLength(26);
    expect(LDWC_DANTON_PBB_ITEMS).toHaveLength(6);
    expect(LDWC_VARIASI_ITEMS).toHaveLength(8);
    expect(LDWC_FORMASI_ITEMS).toHaveLength(10);
    expect(LDWC_DANTON_VARFOR_ITEMS).toHaveLength(3);
    expect(LDWC_PBB_ITEMS.reduce((sum, item) => sum + item.max, 0)).toBe(1000);
    expect(LDWC_DANTON_PBB_ITEMS.reduce((sum, item) => sum + item.max, 0)).toBe(100);
    expect(LDWC_VARIASI_ITEMS.reduce((sum, item) => sum + item.max, 0)).toBe(400);
    expect(LDWC_FORMASI_ITEMS.reduce((sum, item) => sum + item.max, 0)).toBe(600);
    expect(LDWC_DANTON_VARFOR_ITEMS.reduce((sum, item) => sum + item.max, 0)).toBe(52);
    const dantonVarforNames = LDWC_DANTON_VARFOR_ITEMS.map(({ name }) => name);
    expect(dantonVarforNames).not.toContain('Aba-Aba Variasi');
    expect(dantonVarforNames).not.toContain('Aba-Aba Buka Formasi');
    expect(dantonVarforNames).not.toContain('Aba-Aba Tutup Formasi');
  });

  it('matches each item maximum and renders only levels present in the rubric', () => {
    Object.values(getLdwcItems(LDWC_DEFAULT_RUBRIC)).flat().forEach((item) => {
      expect(item.levels.SB).toBe(item.max);
    });
    expect(LDWC_LEVEL_ORDER.filter((level) => LDWC_DANTON_VARFOR_ITEMS[0].levels[level] !== undefined))
      .toHaveLength(9);
    expect(LDWC_LEVEL_ORDER.filter((level) => LDWC_PBB_ITEMS[0].levels[level] !== undefined))
      .toHaveLength(9);
  });

  it('keeps final scoring disabled while LDWC weights are null', () => {
    expect(LDWC_2026_CONFIG.components.every(({ points }) => points === null)).toBe(true);
    expect(isConfigured(LDWC_2026_CONFIG)).toBe(false);
    expect(combine(LDWC_2026_CONFIG, { pbb: 1000, variasi: 400, formasi: 600, dantonPbb: 100, dantonVarfor: 100 }))
      .toBeNull();
  });

  it('parses event rubrics and recalculates item and component maximums dynamically', () => {
    const updated = structuredClone(LDWC_DEFAULT_RUBRIC);
    updated.components.pbb[0] = {
      ...updated.components.pbb[0],
      name: 'Langkah dinamis',
      max: 50,
      levels: { KOSONG: 0, MINIMAL: 25, SB: 50 },
    };

    const parsed = parseLdwcRubric(updated);
    const items = getLdwcItems(parsed);
    expect(items.pbb[0].name).toBe('Langkah dinamis');
    expect(getLdwcMaximums(parsed).pbb).toBe(1012);
    expect(computeRaw(items.pbb.slice(0, 1), [{ itemId: 1, value: 25 }], true)).toBe(25);
  });

  it('rejects event rubrics with scores outside their item maximum', () => {
    const invalid = structuredClone(LDWC_DEFAULT_RUBRIC);
    invalid.components.pbb[0].levels.SB = invalid.components.pbb[0].max + 1;
    expect(() => parseLdwcRubric(invalid)).toThrow('harus antara');
  });

  it('keeps combined Variasi/Formasi submission item IDs unique', () => {
    const invalid = structuredClone(LDWC_DEFAULT_RUBRIC);
    invalid.components.formasi[0].itemId = invalid.components.variasi[0].itemId;
    expect(() => parseLdwcRubric(invalid)).toThrow('dipakai lebih dari sekali');
  });

  it('computes raw totals only after submission and averages only complete judge totals', () => {
    expect(
      computeRaw(
        LDWC_VARIASI_ITEMS.slice(0, 3),
        [
          { itemId: 1, value: 55 },
          { itemId: 2, value: 48 },
          { itemId: 3, value: 48 },
        ],
        true
      )
    ).toBe(151);
    expect(computeRaw(LDWC_VARIASI_ITEMS.slice(0, 2), [{ itemId: 1, value: 55 }], false)).toBeNull();
    expect(averageTotals([700, 800])).toBe(750);
    expect(averageTotals([700, null])).toBeNull();
  });

  it('computes each component from a shared Variasi/Formasi score array', () => {
    const rubricItems = getLdwcItems(LDWC_DEFAULT_RUBRIC);
    const sharedScores = [
      ...rubricItems.variasi.map(({ itemId, levels }) => ({
        itemId,
        value: levels.SB!,
      })),
      ...rubricItems.formasi.map(({ itemId, levels }) => ({
        itemId,
        value: levels.SB!,
      })),
      ...rubricItems.dantonVarfor.map(({ itemId, levels }) => ({
        itemId,
        value: levels.SB!,
      })),
    ];

    expect(computeRawFromSharedScores(rubricItems.variasi, sharedScores, true)).toBe(400);
    expect(computeRawFromSharedScores(rubricItems.formasi, sharedScores, true)).toBe(600);
    expect(computeRawFromSharedScores(rubricItems.dantonVarfor, sharedScores, true)).toBe(52);
  });

  it('sums only requested item ids and treats a submitted set with missing items as incomplete', () => {
    expect(
      sumItems(
        [
          { itemId: 1, value: 10 },
          { itemId: 3, value: 30 },
        ],
        [1, 2, 3]
      )
    ).toBe(40);
    expect(computeRaw(LDWC_VARIASI_ITEMS.slice(0, 3), [{ itemId: 1, value: 55 }], true)).toBeNull();
  });
});
