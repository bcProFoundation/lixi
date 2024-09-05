/*
  Warnings:

  - You are about to drop the column `stateId` on the `offer` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "offer" DROP CONSTRAINT "offer_stateId_fkey";

-- AlterTable
ALTER TABLE "offer" DROP COLUMN "stateId",
ADD COLUMN     "state_id" INTEGER;

-- AddForeignKey
ALTER TABLE "offer" ADD CONSTRAINT "offer_state_id_fkey" FOREIGN KEY ("state_id") REFERENCES "state"("id") ON DELETE SET NULL ON UPDATE CASCADE;
