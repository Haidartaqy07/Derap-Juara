import { describe, expect, it } from 'vitest';
import {
  calculateChampionshipAwards,
  type ChampionshipScoreInput,
} from '../championship-awards';

const maximums = {
  pbb: 1000,
  dantonPbb: 100,
  variasi: 400,
  formasi: 600,
  dantonVarfor: 100,
};

function team(index: number, patch: Partial<ChampionshipScoreInput> = {}): ChampionshipScoreInput {
  return {
    id: `team-${index}`,
    nama_regu: `Regu ${index}`,
    nomor_urut: index,
    category: 'U15',
    vote_count: 0,
    pbbJ1: 800 + index,
    pbbJ2: 800 + index,
    dantonPbbJ1: 80 + index,
    dantonPbbJ2: 80 + index,
    variasi: 300 + index,
    formasi: 500 + index,
    dantonVarfor: 80 + index,
    ...patch,
  };
}

describe('calculateChampionshipAwards', () => {
  it('uses the confirmed weighted formulas and assigns Harapan to ranks four through six', () => {
    const awards = calculateChampionshipAwards(
      Array.from({ length: 7 }, (_, index) => team(index + 1)),
      maximums
    )[0];
    const utama = awards.awards.filter((item) => item.key.startsWith('utama-'));
    const harapan = awards.awards.filter((item) => item.key.startsWith('harapan-'));

    expect(utama.map(({ winners }) => winners[0]?.nomor_urut)).toEqual([7, 6, 5]);
    expect(harapan.map(({ winners }) => winners[0]?.nomor_urut)).toEqual([4, 3, 2]);
    expect(utama[0].winners[0].score).toBeCloseTo(
      ((807 / 1000) * 60) + ((87 / 100) * 5) + ((814 / 1000) * 30) + ((87 / 100) * 5)
    );
  });

  it('awards every listed tier through Juara Siaga III using the Juara Utama formula', () => {
    const category = calculateChampionshipAwards(
      Array.from({ length: 30 }, (_, index) => team(index + 1)),
      maximums
    )[0];
    const rankedTitles = new Set([
      'Juara Utama',
      'Juara Harapan',
      'Juara Madya',
      'Juara Bina',
      'Juara Mula',
      'Juara Purwa',
      'Juara Caraka',
      'Juara Potensial',
      'Juara Perintis',
      'Juara Siaga',
    ]);
    const rankedAwards = category.awards.filter(
      ({ title }) => rankedTitles.has(title)
    );
    const bergilir = category.awards.find(({ key }) => key === 'bergilir')!;
    const utamaPertama = category.awards.find(({ key }) => key === 'utama-i')!;
    const siagaKetiga = category.awards.find(({ key }) => key === 'siaga-iii')!;

    expect(rankedAwards).toHaveLength(30);
    expect(rankedAwards[0]).toMatchObject({ title: 'Juara Utama', placement: 'Juara I' });
    expect(rankedAwards[3]).toMatchObject({ title: 'Juara Harapan', placement: 'Juara I' });
    expect(rankedAwards[6]).toMatchObject({ title: 'Juara Madya', placement: 'Juara I' });
    expect(rankedAwards[27]).toMatchObject({ title: 'Juara Siaga', placement: 'Juara I' });
    expect(siagaKetiga.winners[0].nomor_urut).toBe(1);
    expect(bergilir.winners[0].participantId).toBe(utamaPertama.winners[0].participantId);
    expect(bergilir.winners[0].score).toBe(utamaPertama.winners[0].score);
    expect(bergilir.winners[0].details).toEqual(utamaPertama.winners[0].details);
  });

  it('normalizes voting against the highest vote count in each category', () => {
    const awards = calculateChampionshipAwards(
      [team(1, { vote_count: 50 }), team(2, { vote_count: 100, category: 'U19' })],
      maximums
    );

    const u15General = awards[0].awards.find(({ key }) => key === 'umum')!.winners[0];
    const u19General = awards[1].awards.find(({ key }) => key === 'umum')!.winners[0];

    expect(u15General.details.find(({ label }) => label === 'Voting terverifikasi')?.points).toBe(10);
    expect(u19General.details.find(({ label }) => label === 'Voting terverifikasi')?.points).toBe(10);
  });

  it('uses Formasi to break a tie for Juara Variasi and preserves a remaining tie', () => {
    const awards = calculateChampionshipAwards(
      [
        team(1, { variasi: 350, formasi: 550 }),
        team(2, { variasi: 300, formasi: 600 }),
        team(3, { variasi: 350, formasi: 550 }),
        team(4, { variasi: 300, formasi: 600 }),
      ],
      maximums
    );
    const variation = awards[0].awards.find(({ key }) => key === 'variasi-i')!;

    expect(variation.winners.map(({ nomor_urut }) => nomor_urut)).toEqual([2, 4]);
  });

  it('awards the top three PBB, Danton, and Variasi scores and the requested overall formula places', () => {
    const category = calculateChampionshipAwards(
      Array.from({ length: 5 }, (_, index) => team(index + 1)),
      maximums
    )[0];

    expect(category.awards.filter(({ key }) => key.startsWith('pbb-terbaik-')).map(({ winners }) =>
      winners[0]?.nomor_urut
    )).toEqual([5, 4, 3]);
    expect(category.awards.filter(({ key }) => key.startsWith('danton-')).map(({ winners }) =>
      winners[0]?.nomor_urut
    )).toEqual([5, 4, 3]);
    expect(category.awards.filter(({ key }) => key.startsWith('variasi-')).map(({ winners }) =>
      winners[0]?.nomor_urut
    )).toEqual([5, 4, 3]);
    expect(category.awards.filter(({ key }) => key.startsWith('pemula-')).map(({ winners }) =>
      winners[0]?.nomor_urut
    )).toEqual([5, 4, 3]);
    expect(category.awards.filter(({ key }) => key.startsWith('pelajar-')).map(({ winners }) =>
      winners[0]?.nomor_urut
    )).toEqual([5, 4]);
  });

  it('shares component placements when scores tie and uses competition ranks', () => {
    const category = calculateChampionshipAwards(
      [
        team(1, { pbbJ1: 950, pbbJ2: 950 }),
        team(2, { pbbJ1: 950, pbbJ2: 950 }),
        team(3, { pbbJ1: 900, pbbJ2: 900 }),
        team(4, { pbbJ1: 850, pbbJ2: 850 }),
      ],
      maximums
    )[0];
    const pbbFirst = category.awards.find(({ key }) => key === 'pbb-terbaik-i')!;
    const pbbSecond = category.awards.find(({ key }) => key === 'pbb-terbaik-ii')!;
    const pbbThird = category.awards.find(({ key }) => key === 'pbb-terbaik-iii')!;

    expect(pbbFirst.winners.map(({ nomor_urut }) => nomor_urut)).toEqual([1, 2]);
    expect(pbbSecond.winners).toEqual([]);
    expect(pbbThird.winners.map(({ nomor_urut }) => nomor_urut)).toEqual([3]);
  });

  it('does not silently break a tie in Juara Utama', () => {
    expect(() =>
      calculateChampionshipAwards(
        [team(1), team(2, { pbbJ1: 801, pbbJ2: 801, dantonPbbJ1: 81, dantonPbbJ2: 81, variasi: 301, formasi: 501, dantonVarfor: 81 })],
        maximums
      )
    ).toThrow(/Juara Utama sampai Juara Siaga seri/);
  });

  it('allows ties outside the awarded Juara Utama and Harapan positions', () => {
    expect(() =>
      calculateChampionshipAwards(
        [
          ...Array.from({ length: 7 }, (_, index) => team(index + 1)),
          team(8, {
            id: 'team-9',
            nama_regu: 'Regu 9',
            nomor_urut: 9,
            pbbJ1: 800,
            pbbJ2: 800,
            dantonPbbJ1: 80,
            dantonPbbJ2: 80,
            variasi: 300,
            formasi: 500,
            dantonVarfor: 80,
          }),
        ],
        maximums
      )
    ).not.toThrow();
  });

  it('does not silently assign a tie within the last ranked award tier', () => {
    const participants = Array.from({ length: 30 }, (_, index) => team(index + 1));
    participants[29] = team(29, { id: 'team-30', nama_regu: 'Regu 30', nomor_urut: 30 });

    expect(() => calculateChampionshipAwards(participants, maximums)).toThrow(
      /Juara Utama sampai Juara Siaga seri/
    );
  });
});
