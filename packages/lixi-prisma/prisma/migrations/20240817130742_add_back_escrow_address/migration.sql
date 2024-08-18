/*
  Warnings:

  - A unique constraint covering the columns `[escrow_address]` on the table `escrow_order` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `escrow_address` to the `escrow_order` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "escrow_order" ADD COLUMN     "escrow_address" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "escrow_order_escrow_address_key" ON "escrow_order"("escrow_address");
