/*
  Warnings:

  - You are about to drop the column `handle` on the `handle` table. All the data in the column will be lost.
  - Added the required column `name` to the `handle` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "handle" DROP COLUMN "handle",
ADD COLUMN     "name" VARCHAR(150) NOT NULL;

-- CreateIndex
CREATE INDEX "handle_name_idx" ON "handle"("name");
