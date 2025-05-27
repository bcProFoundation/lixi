/*
  Warnings:

  - A unique constraint covering the columns `[escrow_fee_script]` on the table `escrow_order` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[return_fee_signatory]` on the table `escrow_order` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "escrow_order" ADD COLUMN     "escrow_fee_script" BYTEA,
ADD COLUMN     "return_fee_signatory" BYTEA,
ADD COLUMN     "signatory_owner_fee_hash160" BYTEA;

-- CreateIndex
CREATE UNIQUE INDEX "escrow_order_escrow_fee_script_key" ON "escrow_order"("escrow_fee_script");

-- CreateIndex
CREATE UNIQUE INDEX "escrow_order_return_fee_signatory_key" ON "escrow_order"("return_fee_signatory");
