/*
  Warnings:

  - A unique constraint covering the columns `[escrow_address]` on the table `escrow_order` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[escrow_script]` on the table `escrow_order` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[nonce]` on the table `escrow_order` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "escrow_order" ADD COLUMN     "escrow_script" BYTEA,
ADD COLUMN     "nonce" BYTEA;

-- CreateIndex
CREATE UNIQUE INDEX "escrow_order_escrow_address_key" ON "escrow_order"("escrow_address");

-- CreateIndex
CREATE UNIQUE INDEX "escrow_order_escrow_script_key" ON "escrow_order"("escrow_script");

-- CreateIndex
CREATE UNIQUE INDEX "escrow_order_nonce_key" ON "escrow_order"("nonce");
