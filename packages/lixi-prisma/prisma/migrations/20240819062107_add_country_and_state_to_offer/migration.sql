/*
  Warnings:

  - You are about to drop the column `location` on the `offer` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "offer" DROP COLUMN "location",
ADD COLUMN     "country_id" INTEGER,
ADD COLUMN     "stateId" INTEGER;

-- AddForeignKey
ALTER TABLE "offer" ADD CONSTRAINT "offer_country_id_fkey" FOREIGN KEY ("country_id") REFERENCES "country"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "offer" ADD CONSTRAINT "offer_stateId_fkey" FOREIGN KEY ("stateId") REFERENCES "state"("id") ON DELETE SET NULL ON UPDATE CASCADE;
