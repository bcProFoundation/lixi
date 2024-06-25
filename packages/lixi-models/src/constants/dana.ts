export const GHPerDanaStart = 110;
export const ratioHash256 = 2857;
export const epoch = '2024-06-01 00:00:00';

export type DanaRate = {
  blockHeight: number;
  difficulty: number;
  GHPerSecond: number;
  GHPerBlockTime: number;
  issuance: number;
  GHPerDana: number;
  coinPerDana: number;
};
