/*
  Warnings:

  - You are about to drop the column `_id` on the `offer` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "offer" DROP CONSTRAINT "offer__id_fkey";

-- DropIndex
DROP INDEX "world_cities_iso2_admin_name_ascii_idx";

-- AlterTable
ALTER TABLE "offer" DROP COLUMN "_id",
ADD COLUMN     "location_id" TEXT;

-- CreateIndex
CREATE INDEX "offer_location_id_idx" ON "offer"("location_id");

-- CreateIndex
CREATE INDEX "world_cities_iso2_admin_code_idx" ON "world_cities"("iso2", "admin_code");

-- AddForeignKey
ALTER TABLE "offer" ADD CONSTRAINT "offer_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "world_cities"("id") ON DELETE SET NULL ON UPDATE CASCADE;
