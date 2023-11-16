/*
  Warnings:

  - The `type` column on the `commentable` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- CreateEnum
CREATE TYPE "comment_type" AS ENUM ('POST', 'EVENT', 'POLL', 'PRODUCT');

-- AlterTable
ALTER TABLE "commentable" DROP COLUMN "type",
ADD COLUMN     "type" "comment_type" NOT NULL DEFAULT 'POST';

-- CreateIndex
CREATE INDEX "post_commentable_id_idx" ON "post"("commentable_id");
