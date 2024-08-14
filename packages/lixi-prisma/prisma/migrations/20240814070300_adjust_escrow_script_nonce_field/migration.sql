/*
  Warnings:

  - Made the column `escrow_script` on table `escrow_order` required. This step will fail if there are existing NULL values in that column.
  - Made the column `nonce` on table `escrow_order` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "escrow_order" ALTER COLUMN "escrow_script" SET NOT NULL,
ALTER COLUMN "nonce" SET NOT NULL,
ALTER COLUMN "nonce" SET DATA TYPE TEXT;
