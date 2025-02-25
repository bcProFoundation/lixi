/*
  Warnings:

  - You are about to drop the column `hashAddress` on the `chronik_watch_address` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[account_id,hash_160]` on the table `chronik_watch_address` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `hash_160` to the `chronik_watch_address` table without a default value. This is not possible if the table is not empty.
  - Added the required column `type` to the `chronik_watch_address` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "chronik_watch_address_account_id_hashAddress_key";

-- DropIndex
DROP INDEX "chronik_watch_address_hashAddress_idx";

-- AlterTable
ALTER TABLE "chronik_watch_address" DROP COLUMN "hashAddress",
ADD COLUMN     "hash_160" TEXT NOT NULL,
ADD COLUMN     "type" TEXT NOT NULL;

-- CreateIndex
CREATE INDEX "chronik_watch_address_hash_160_idx" ON "chronik_watch_address"("hash_160");

-- CreateIndex
CREATE UNIQUE INDEX "chronik_watch_address_account_id_hash_160_key" ON "chronik_watch_address"("account_id", "hash_160");
