/*
  Warnings:

  - You are about to drop the column `type` on the `EscrowTxId` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[escrow_fee_address]` on the table `escrow_order` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "EscrowTxId" DROP COLUMN "type",
ADD COLUMN     "feeOutIdx" INTEGER,
ADD COLUMN     "feeValue" BIGINT;

-- AlterTable
ALTER TABLE "escrow_order" ADD COLUMN     "escrow_fee_address" TEXT;

-- DropEnum
DROP TYPE "EscrowTxIdType";

-- CreateIndex
CREATE UNIQUE INDEX "escrow_order_escrow_fee_address_key" ON "escrow_order"("escrow_fee_address");
