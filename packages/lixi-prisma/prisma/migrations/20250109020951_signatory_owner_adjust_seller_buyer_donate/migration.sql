/*
  Warnings:

  - You are about to drop the column `buyer_donate` on the `escrow_order` table. All the data in the column will be lost.
  - You are about to drop the column `seller_donate` on the `escrow_order` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "escrow_order" DROP COLUMN "buyer_donate",
DROP COLUMN "seller_donate",
ADD COLUMN     "buyer_donate_amount" DOUBLE PRECISION,
ADD COLUMN     "seller_donate_amount" DOUBLE PRECISION,
ADD COLUMN     "signatory_owner_hash160" BYTEA;
