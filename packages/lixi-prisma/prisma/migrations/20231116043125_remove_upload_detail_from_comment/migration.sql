/*
  Warnings:

  - You are about to drop the column `commentId` on the `upload_detail` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "upload_detail" DROP CONSTRAINT "upload_detail_commentId_fkey";

-- DropIndex
DROP INDEX "upload_detail_commentId_key";

-- AlterTable
ALTER TABLE "upload_detail" DROP COLUMN "commentId";
