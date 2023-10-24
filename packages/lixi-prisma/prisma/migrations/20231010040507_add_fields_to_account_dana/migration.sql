-- AlterTable
ALTER TABLE "account_dana" ADD COLUMN     "dana_received_down" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
ADD COLUMN     "dana_received_score" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
ADD COLUMN     "dana_received_up" DOUBLE PRECISION NOT NULL DEFAULT 0.0;
