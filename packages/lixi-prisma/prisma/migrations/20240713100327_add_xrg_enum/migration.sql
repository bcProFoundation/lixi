-- AlterEnum
ALTER TYPE "Coin" ADD VALUE 'XRG';

-- AlterTable
ALTER TABLE "wallet_path" ALTER COLUMN "network" SET DEFAULT 'XPI';
