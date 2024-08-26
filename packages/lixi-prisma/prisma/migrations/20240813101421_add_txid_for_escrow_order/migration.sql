/*
  Warnings:

  - You are about to drop the column `escrow_address` on the `escrow_order` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[escrow_txid]` on the table `escrow_order` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[release_txid]` on the table `escrow_order` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[return_txid]` on the table `escrow_order` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "escrow_order_escrow_address_key";

-- AlterTable
ALTER TABLE "escrow_order" DROP COLUMN "escrow_address",
ADD COLUMN     "escrow_txid" TEXT,
ADD COLUMN     "release_txid" TEXT,
ADD COLUMN     "return_txid" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "escrow_order_escrow_txid_key" ON "escrow_order"("escrow_txid");

-- CreateIndex
CREATE UNIQUE INDEX "escrow_order_release_txid_key" ON "escrow_order"("release_txid");

-- CreateIndex
CREATE UNIQUE INDEX "escrow_order_return_txid_key" ON "escrow_order"("return_txid");
