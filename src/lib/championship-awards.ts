import type { ParticipantCategory } from '@/types';

export type ChampionshipScoreInput = {
  id: string;
  nama_regu: string;
  nomor_urut: number;
  category: ParticipantCategory;
  vote_count: number;
  pbbJ1: number;
  pbbJ2: number;
  dantonPbbJ1: number;
  dantonPbbJ2: number;
  variasi: number;
  formasi: number;
  dantonVarfor: number;
};

export type AwardScoreDetail = {
  label: string;
  raw: number;
  maximum: number;
  weight: number | null;
  points: number;
};

export type AwardWinner = {
  participantId: string;
  nama_regu: string;
  nomor_urut: number;
  category: ParticipantCategory;
  score: number;
  details: AwardScoreDetail[];
};

export type ChampionshipAward = {
  key: string;
  title: string;
  placement: string;
  winners: AwardWinner[];
};

export type ChampionshipCategoryAwards = {
  category: ParticipantCategory;
  awards: ChampionshipAward[];
};

export type ChampionshipMaximums = {
  pbb: number;
  dantonPbb: number;
  variasi: number;
  formasi: number;
  dantonVarfor: number;
};

const awardPlacements = [
  { key: 'utama', title: 'Juara Utama' },
  { key: 'harapan', title: 'Juara Harapan' },
  { key: 'madya', title: 'Juara Madya' },
  { key: 'bina', title: 'Juara Bina' },
  { key: 'mula', title: 'Juara Mula' },
  { key: 'purwa', title: 'Juara Purwa' },
  { key: 'caraka', title: 'Juara Caraka' },
  { key: 'potensial', title: 'Juara Potensial' },
  { key: 'perintis', title: 'Juara Perintis' },
  { key: 'siaga', title: 'Juara Siaga' },
] as const;
const romanPlacements = ['I', 'II', 'III'] as const;
const maximumAwardedRank = awardPlacements.length * romanPlacements.length;
const podiumPlacements = ['I', 'II', 'III'] as const;

function rankedWinners<T>(
  values: T[],
  compare: (first: T, second: T) => number,
  score: (value: T) => number,
  placementIndex: number
) {
  const ranked = [...values].sort(compare);
  let currentRank = 0;
  const winners: Array<{ participant: T; score: number }> = [];
  ranked.forEach((participant, index) => {
    if (index === 0 || compare(ranked[index - 1], participant) !== 0) {
      currentRank = index + 1;
    }
    if (currentRank === placementIndex + 1) {
      winners.push({ participant, score: score(participant) });
    }
  });
  return winners;
}

function average(first: number, second: number) {
  return (first + second) / 2;
}

function scoreDetails(
  parts: Array<{ label: string; raw: number; maximum: number; weight: number | null }>
): AwardScoreDetail[] {
  return parts.map((part) => ({
    ...part,
    points: part.weight === null ? part.raw : (part.raw / part.maximum) * part.weight,
  }));
}

function weightedTotal(
  participant: ChampionshipScoreInput,
  mode: 'utama' | 'umum',
  maxVotes: number,
  maximums: ChampionshipMaximums
) {
  const pbb = average(participant.pbbJ1, participant.pbbJ2);
  const dantonPbb = average(participant.dantonPbbJ1, participant.dantonPbbJ2);
  const vafor = participant.variasi + participant.formasi;
  const details =
    mode === 'utama'
      ? scoreDetails([
          { label: 'PBB (rata-rata Juri 1 & 2)', raw: pbb, maximum: maximums.pbb, weight: 60 },
          { label: 'Danton PBB (rata-rata Juri 1 & 2)', raw: dantonPbb, maximum: maximums.dantonPbb, weight: 5 },
          { label: 'Variasi + Formasi', raw: vafor, maximum: maximums.variasi + maximums.formasi, weight: 30 },
          { label: 'Danton Variasi/Formasi', raw: participant.dantonVarfor, maximum: maximums.dantonVarfor, weight: 5 },
        ])
      : scoreDetails([
          { label: 'PBB (rata-rata Juri 1 & 2)', raw: pbb, maximum: maximums.pbb, weight: 50 },
          { label: 'Variasi + Formasi', raw: vafor, maximum: maximums.variasi + maximums.formasi, weight: 30 },
          { label: 'Danton PBB (rata-rata Juri 1 & 2)', raw: dantonPbb, maximum: maximums.dantonPbb, weight: 10 },
          {
            label: 'Voting terverifikasi',
            raw: participant.vote_count,
            maximum: maxVotes || 1,
            weight: 10,
          },
        ]);
  return details.reduce((sum, detail) => sum + detail.points, 0);
}

function makeWinner(
  participant: ChampionshipScoreInput,
  score: number,
  details: AwardScoreDetail[]
): AwardWinner {
  return {
    participantId: participant.id,
    nama_regu: participant.nama_regu,
    nomor_urut: participant.nomor_urut,
    category: participant.category,
    score: Number(score.toFixed(4)),
    details,
  };
}

function sortedByScore<T>(values: T[], score: (value: T) => number) {
  return [...values].sort((a, b) => score(b) - score(a));
}

function assertNoRankingTies<T>(
  values: T[],
  score: (value: T) => number,
  title: string,
  rankedPositions: number
) {
  for (let index = 1; index < values.length && index <= rankedPositions; index += 1) {
    if (Math.abs(score(values[index - 1]) - score(values[index])) < 0.0001) {
      throw new Error(`Skor ${title} seri. Periksa dan tetapkan aturan tie-break sebelum mengumumkan juara.`);
    }
  }
}

function award(
  key: string,
  title: string,
  placement: string,
  winners: AwardWinner[]
): ChampionshipAward {
  return { key, title, placement, winners };
}

function mainAwardDetails(
  participant: ChampionshipScoreInput,
  maximums: ChampionshipMaximums
) {
  return scoreDetails([
    {
      label: 'PBB (rata-rata Juri 1 & 2)',
      raw: average(participant.pbbJ1, participant.pbbJ2),
      maximum: maximums.pbb,
      weight: 60,
    },
    {
      label: 'Danton PBB (rata-rata Juri 1 & 2)',
      raw: average(participant.dantonPbbJ1, participant.dantonPbbJ2),
      maximum: maximums.dantonPbb,
      weight: 5,
    },
    {
      label: 'Variasi + Formasi',
      raw: participant.variasi + participant.formasi,
      maximum: maximums.variasi + maximums.formasi,
      weight: 30,
    },
    {
      label: 'Danton Variasi/Formasi',
      raw: participant.dantonVarfor,
      maximum: maximums.dantonVarfor,
      weight: 5,
    },
  ]);
}

export function calculateChampionshipAwards(
  participants: ChampionshipScoreInput[],
  maximums: ChampionshipMaximums
): ChampionshipCategoryAwards[] {
  const categories: ParticipantCategory[] = ['U15', 'U19'];

  return categories.flatMap((category) => {
    const categoryParticipants = participants.filter((participant) => participant.category === category);
    if (categoryParticipants.length === 0) return [];
    const maxVotes = Math.max(0, ...categoryParticipants.map(({ vote_count }) => vote_count));

    const utamaRanked = sortedByScore(categoryParticipants, (participant) =>
      weightedTotal(participant, 'utama', maxVotes, maximums)
    );
    const umumRanked = sortedByScore(categoryParticipants, (participant) =>
      weightedTotal(participant, 'umum', maxVotes, maximums)
    );
    const mainScore = (participant: ChampionshipScoreInput) =>
      weightedTotal(participant, 'utama', maxVotes, maximums);
    assertNoRankingTies(
      utamaRanked,
      (participant) => weightedTotal(participant, 'utama', maxVotes, maximums),
      'Juara Utama sampai Juara Siaga',
      maximumAwardedRank
    );
    assertNoRankingTies(
      umumRanked,
      (participant) => weightedTotal(participant, 'umum', maxVotes, maximums),
      'Juara Umum',
      1
    );

    const bergilirWinner = utamaRanked[0];
    const makeOverallRankedAwards = (
      keyPrefix: string,
      title: string,
      placements: readonly string[],
      rankedParticipants: ChampionshipScoreInput[],
      startRank = 0
    ) => placements.map((placement, index) => {
      const participant = rankedParticipants[startRank + index];
      return award(
        `${keyPrefix}-${podiumPlacements[index].toLowerCase()}`,
        title,
        placement,
        participant
          ? [makeWinner(participant, mainScore(participant), mainAwardDetails(participant, maximums))]
          : []
      );
    });
    const rankedAwards = awardPlacements.flatMap(({ key, title }, tierIndex) =>
      makeOverallRankedAwards(
        key,
        title,
        romanPlacements.map((placement) => `Juara ${placement}`),
        utamaRanked,
        tierIndex * romanPlacements.length
      )
    );
    const pemulaAwards = makeOverallRankedAwards(
      'pemula',
      'Juara Pemula',
      ['Juara I', 'Juara II', 'Juara III'],
      utamaRanked
    );
    const pelajarAwards = makeOverallRankedAwards(
      'pelajar',
      'Juara Pelajar',
      ['Juara I', 'Juara II'],
      utamaRanked
    );

    const umum = umumRanked[0];
    const pbbBestScore = (participant: ChampionshipScoreInput) =>
      average(participant.pbbJ1, participant.pbbJ2);
    const dantonBestScore = (participant: ChampionshipScoreInput) =>
      average(participant.dantonPbbJ1, participant.dantonPbbJ2);
    const variationScore = (participant: ChampionshipScoreInput) =>
      participant.variasi + participant.formasi;
    const bestComponentAwards = (
      key: string,
      title: string,
      placementTitle: string,
      score: (participant: ChampionshipScoreInput) => number,
      details: (participant: ChampionshipScoreInput) => AwardScoreDetail[],
      compare: (first: ChampionshipScoreInput, second: ChampionshipScoreInput) => number
    ) => podiumPlacements.map((placement, index) =>
      award(
        `${key}-${placement.toLowerCase()}`,
        title,
        `${placementTitle} ${placement}`,
        rankedWinners(categoryParticipants, compare, score, index).map(({ participant, score: value }) =>
          makeWinner(participant, value, details(participant))
        )
      )
    );
    const pbbAwards = bestComponentAwards(
      'pbb-terbaik',
      'Juara PBB Terbaik',
      'PBB Terbaik',
      pbbBestScore,
      (participant) => scoreDetails([
        { label: 'PBB Juri 1', raw: participant.pbbJ1, maximum: maximums.pbb, weight: null },
        { label: 'PBB Juri 2', raw: participant.pbbJ2, maximum: maximums.pbb, weight: null },
      ]),
      (first, second) => pbbBestScore(second) - pbbBestScore(first)
    );
    const dantonAwards = bestComponentAwards(
      'danton',
      'Juara Danton',
      'Danton Terbaik',
      dantonBestScore,
      (participant) => scoreDetails([
        {
          label: 'Danton PBB Juri 1',
          raw: participant.dantonPbbJ1,
          maximum: maximums.dantonPbb,
          weight: null,
        },
        {
          label: 'Danton PBB Juri 2',
          raw: participant.dantonPbbJ2,
          maximum: maximums.dantonPbb,
          weight: null,
        },
      ]),
      (first, second) => dantonBestScore(second) - dantonBestScore(first)
    );
    const variationAwards = bestComponentAwards(
      'variasi',
      'Juara Variasi',
      'Variasi Terbaik',
      variationScore,
      (participant) => scoreDetails([
        { label: 'Variasi', raw: participant.variasi, maximum: maximums.variasi, weight: null },
        { label: 'Formasi (tie-break)', raw: participant.formasi, maximum: maximums.formasi, weight: null },
      ]),
      (first, second) =>
        variationScore(second) - variationScore(first) || second.formasi - first.formasi
    );

    const awards = [
      award(
        'bergilir',
        'Juara Bergilir',
        'Piala Bergilir',
        bergilirWinner
          ? [
              makeWinner(
                bergilirWinner,
                weightedTotal(bergilirWinner, 'utama', maxVotes, maximums),
                mainAwardDetails(bergilirWinner, maximums)
              ),
            ]
          : []
      ),
      ...rankedAwards,
      ...pemulaAwards,
      ...pelajarAwards,
      award(
        'umum',
        'Juara Umum',
        'Juara Umum',
        umum
          ? [
              makeWinner(
                umum,
                weightedTotal(umum, 'umum', maxVotes, maximums),
                scoreDetails([
                  {
                    label: 'PBB (rata-rata Juri 1 & 2)',
                    raw: average(umum.pbbJ1, umum.pbbJ2),
                    maximum: maximums.pbb,
                    weight: 50,
                  },
                  {
                    label: 'Variasi + Formasi',
                    raw: umum.variasi + umum.formasi,
                    maximum: maximums.variasi + maximums.formasi,
                    weight: 30,
                  },
                  {
                    label: 'Danton PBB (rata-rata Juri 1 & 2)',
                    raw: average(umum.dantonPbbJ1, umum.dantonPbbJ2),
                    maximum: maximums.dantonPbb,
                    weight: 10,
                  },
                  {
                    label: 'Voting terverifikasi',
                    raw: umum.vote_count,
                    maximum: maxVotes || 1,
                    weight: 10,
                  },
                ])
              ),
            ]
          : []
      ),
      ...pbbAwards,
      ...dantonAwards,
      ...variationAwards,
    ];

    return [{ category, awards }];
  });
}
