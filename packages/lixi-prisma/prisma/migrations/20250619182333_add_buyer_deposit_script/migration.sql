/*
  Warnings:

  - A unique constraint covering the columns `[escrow_buyer_deposit_fee_address]` on the table `escrow_order` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[return_buyer_deposit_fee_txid]` on the table `escrow_order` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[escrow_buyer_deposit_fee_script]` on the table `escrow_order` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "EscrowTxId" ADD COLUMN     "buyer_deposit_fee_out_idx" INTEGER,
ADD COLUMN     "buyer_deposit_fee_value" BIGINT;

-- AlterTable
ALTER TABLE "escrow_order" ADD COLUMN     "escrow_buyer_deposit_fee_address" TEXT,
ADD COLUMN     "escrow_buyer_deposit_fee_script" BYTEA,
ADD COLUMN     "return_buyer_deposit_fee_signatory" BYTEA,
ADD COLUMN     "return_buyer_deposit_fee_txid" TEXT,
ADD COLUMN     "signatory_owner_buyer_deposit_fee_hash160" BYTEA;

-- CreateIndex
CREATE UNIQUE INDEX "escrow_order_escrow_buyer_deposit_fee_address_key" ON "escrow_order"("escrow_buyer_deposit_fee_address");

-- CreateIndex
CREATE UNIQUE INDEX "escrow_order_return_buyer_deposit_fee_txid_key" ON "escrow_order"("return_buyer_deposit_fee_txid");

-- CreateIndex
CREATE UNIQUE INDEX "escrow_order_escrow_buyer_deposit_fee_script_key" ON "escrow_order"("escrow_buyer_deposit_fee_script");
