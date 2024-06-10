export const GHPerDana = 100;
export const adjustRate = 0.99918;
export const ratioHash256 = 5714;
export const issuanceXEC = 3125000;
export const averageDanaToXPI = 130;
export const averageDanaToXEC = 15;

export type DataRate = {
  difficulty: number;
  GHPerSecond: number;
  GHPerBlockTime: number;
  issuance: number;
  GHPerDana: number;
  coinPerDana: number;
};
