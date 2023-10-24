/*
  Warnings:

  - Added the required column `end_date` to the `poll` table without a default value. This is not possible if the table is not empty.
  - Added the required column `start_date` to the `poll` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "event_dana" ADD COLUMN     "dana_received_down" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
ADD COLUMN     "dana_received_score" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
ADD COLUMN     "dana_received_up" DOUBLE PRECISION NOT NULL DEFAULT 0.0;

-- AlterTable
ALTER TABLE "poll" ADD COLUMN     "end_date" TIMESTAMPTZ NOT NULL,
ADD COLUMN     "start_date" TIMESTAMPTZ NOT NULL;

-- AlterTable
ALTER TABLE "poll_dana" ADD COLUMN     "dana_received_down" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
ADD COLUMN     "dana_received_score" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
ADD COLUMN     "dana_received_up" DOUBLE PRECISION NOT NULL DEFAULT 0.0;
