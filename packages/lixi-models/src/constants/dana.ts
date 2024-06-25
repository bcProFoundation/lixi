export const GHPerDanaStart = 110;
export const ratioHash256 = 2857;

export type DanaRate = {
  blockHeight: number;
  difficulty: number;
  GHPerSecond: number;
  GHPerBlockTime: number;
  issuance: number;
  GHPerDana: number;
  coinPerDana: number;
};
