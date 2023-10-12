/*
  Warnings:

  - A unique constraint covering the columns `[commentId]` on the table `upload_detail` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "upload_detail" ADD COLUMN     "commentId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "upload_detail_commentId_key" ON "upload_detail"("commentId");

-- AddForeignKey
ALTER TABLE "upload_detail" ADD CONSTRAINT "upload_detail_commentId_fkey" FOREIGN KEY ("commentId") REFERENCES "comment"("id") ON DELETE SET NULL ON UPDATE CASCADE;
