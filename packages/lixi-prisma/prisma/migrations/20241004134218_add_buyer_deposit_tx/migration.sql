/*
  Warnings:

  - A unique constraint covering the columns `[buyer_deposit_tx]` on the table `escrow_order` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "escrow_order" ADD COLUMN     "buyer_deposit_tx" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "escrow_order_buyer_deposit_tx_key" ON "escrow_order"("buyer_deposit_tx");
