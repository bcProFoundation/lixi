/*
  Warnings:

  - You are about to drop the column `escrow_txid` on the `escrow_order` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "escrow_order_escrow_txid_key";

-- AlterTable
ALTER TABLE "escrow_order" DROP COLUMN "escrow_txid";

-- CreateTable
CREATE TABLE "EscrowTxId" (
    "txid" TEXT NOT NULL,
    "escrowOrderId" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE UNIQUE INDEX "EscrowTxId_txid_key" ON "EscrowTxId"("txid");

-- AddForeignKey
ALTER TABLE "EscrowTxId" ADD CONSTRAINT "EscrowTxId_escrowOrderId_fkey" FOREIGN KEY ("escrowOrderId") REFERENCES "escrow_order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
