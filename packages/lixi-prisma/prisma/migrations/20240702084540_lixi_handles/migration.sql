/*
  Warnings:

  - You are about to drop the column `handle_number` on the `handle` table. All the data in the column will be lost.
  - Added the required column `block_height` to the `handle` table without a default value. This is not possible if the table is not empty.
  - Added the required column `txid` to the `handle` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "handle_handle_handle_number_key";

-- AlterTable
ALTER TABLE "handle" DROP COLUMN "handle_number",
ADD COLUMN     "address" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "block_height" INTEGER NOT NULL,
ADD COLUMN     "network" "Coin" NOT NULL DEFAULT 'XPI',
ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'pending',
ADD COLUMN     "txid" TEXT NOT NULL;

-- CreateIndex
CREATE INDEX "handle_address_idx" ON "handle"("address");

-- CreateIndex
CREATE INDEX "handle_address_txid_idx" ON "handle"("address", "txid");
