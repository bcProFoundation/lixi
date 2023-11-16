/*
  Warnings:

  - You are about to drop the column `dana_burn_down` on the `token` table. All the data in the column will be lost.
  - You are about to drop the column `dana_burn_score` on the `token` table. All the data in the column will be lost.
  - You are about to drop the column `dana_burn_up` on the `token` table. All the data in the column will be lost.
  - You are about to drop the column `total_burned` on the `token` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "token" DROP COLUMN "dana_burn_down",
DROP COLUMN "dana_burn_score",
DROP COLUMN "dana_burn_up",
DROP COLUMN "total_burned";
