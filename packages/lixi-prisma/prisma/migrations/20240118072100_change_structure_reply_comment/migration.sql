/*
  Warnings:

  - You are about to drop the `comment_closure` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "comment_closure" DROP CONSTRAINT "comment_closure_commentId_fkey";

-- DropForeignKey
ALTER TABLE "comment_dana" DROP CONSTRAINT "comment_dana_comment_id_fkey";

-- AlterTable
ALTER TABLE "comment" ADD COLUMN     "rootId" TEXT;

-- DropTable
DROP TABLE "comment_closure";

-- AddForeignKey
ALTER TABLE "comment" ADD CONSTRAINT "comment_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "comment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comment_dana" ADD CONSTRAINT "comment_dana_comment_id_fkey" FOREIGN KEY ("comment_id") REFERENCES "comment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
