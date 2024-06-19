export const GHPerDana = 100;
export const adjustRate = 0.99918;
export const ratioHash256 = 5714;

export type DanaRate = {
  blockHeight: number;
  difficulty: number;
  GHPerSecond: number;
  GHPerBlockTime: number;
  issuance: number;
  GHPerDana: number;
  coinPerDana: number;
};
