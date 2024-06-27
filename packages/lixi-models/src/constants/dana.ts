export const ratioHash256 = 2857;
export const GHPerDanaStart = ratioHash256 * 110;

export type DanaRate = {
  blockHeight: number;
  difficulty: number;
  GHPerSecond: number;
  GHPerBlockTime: number;
  issuance: number;
  GHPerDana: number;
  coinPerDana: number;
};
