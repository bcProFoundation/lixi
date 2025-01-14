/*
  Warnings:

  - A unique constraint covering the columns `[release_signatory]` on the table `escrow_order` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[return_signatory]` on the table `escrow_order` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "escrow_order" ADD COLUMN     "release_signatory" BYTEA,
ADD COLUMN     "return_signatory" BYTEA;

-- CreateIndex
CREATE UNIQUE INDEX "escrow_order_release_signatory_key" ON "escrow_order"("release_signatory");

-- CreateIndex
CREATE UNIQUE INDEX "escrow_order_return_signatory_key" ON "escrow_order"("return_signatory");
