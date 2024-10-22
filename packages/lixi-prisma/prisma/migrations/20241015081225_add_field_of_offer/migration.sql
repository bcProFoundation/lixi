/*
  Warnings:

  - Added the required column `margin_percentage` to the `offer` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "offer" ADD COLUMN     "coin_payment" TEXT,
ADD COLUMN     "local_currency" TEXT,
ADD COLUMN     "margin_percentage" DOUBLE PRECISION NOT NULL;
