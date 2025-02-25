/*
  Warnings:

  - You are about to drop the column `address` on the `chronik_watch_address` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[account_id,hashAddress]` on the table `chronik_watch_address` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `hashAddress` to the `chronik_watch_address` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "chronik_watch_address_account_id_address_key";

-- AlterTable
ALTER TABLE "chronik_watch_address" DROP COLUMN "address",
ADD COLUMN     "hashAddress" TEXT NOT NULL;

-- CreateIndex
CREATE INDEX "chronik_watch_address_hashAddress_idx" ON "chronik_watch_address"("hashAddress");

-- CreateIndex
CREATE UNIQUE INDEX "chronik_watch_address_account_id_hashAddress_key" ON "chronik_watch_address"("account_id", "hashAddress");
