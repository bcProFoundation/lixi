/*
  Warnings:

  - A unique constraint covering the columns `[return_fee_txid]` on the table `escrow_order` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "escrow_order" ADD COLUMN     "return_fee_txid" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "escrow_order_return_fee_txid_key" ON "escrow_order"("return_fee_txid");
