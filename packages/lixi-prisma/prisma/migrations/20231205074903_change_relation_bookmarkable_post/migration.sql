/*
  Warnings:

  - You are about to drop the column `postId` on the `bookmarkable` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[bookmarkable_id]` on the table `post` will be added. If there are existing duplicate values, this will fail.

*/
-- DropForeignKey
ALTER TABLE "bookmarkable" DROP CONSTRAINT "bookmarkable_postId_fkey";

-- AlterTable
ALTER TABLE "bookmarkable" DROP COLUMN "postId";

-- AlterTable
ALTER TABLE "post" ADD COLUMN     "bookmarkable_id" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "post_bookmarkable_id_key" ON "post"("bookmarkable_id");

-- AddForeignKey
ALTER TABLE "post" ADD CONSTRAINT "post_bookmarkable_id_fkey" FOREIGN KEY ("bookmarkable_id") REFERENCES "bookmarkable"("id") ON DELETE SET NULL ON UPDATE CASCADE;
