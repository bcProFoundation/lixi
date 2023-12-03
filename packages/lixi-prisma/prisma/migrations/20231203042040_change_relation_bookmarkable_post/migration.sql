/*
  Warnings:

  - You are about to drop the column `bookmarkable_id` on the `post` table. All the data in the column will be lost.
  - Added the required column `postId` to the `bookmarkable` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "bookmark" DROP CONSTRAINT "bookmark_bookmarkable_id_fkey";

-- DropForeignKey
ALTER TABLE "post" DROP CONSTRAINT "post_bookmarkable_id_fkey";

-- AlterTable
ALTER TABLE "bookmark" ALTER COLUMN "bookmarkable_id" DROP NOT NULL;

-- AlterTable
ALTER TABLE "bookmarkable" ADD COLUMN     "postId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "post" DROP COLUMN "bookmarkable_id";

-- AddForeignKey
ALTER TABLE "bookmarkable" ADD CONSTRAINT "bookmarkable_postId_fkey" FOREIGN KEY ("postId") REFERENCES "post"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookmark" ADD CONSTRAINT "bookmark_bookmarkable_id_fkey" FOREIGN KEY ("bookmarkable_id") REFERENCES "bookmarkable"("id") ON DELETE SET NULL ON UPDATE CASCADE;
