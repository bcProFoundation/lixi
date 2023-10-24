/*
  Warnings:

  - Added the required column `type` to the `bookmarkable` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "BookmarkType" AS ENUM ('POST', 'COMMENT');

-- AlterTable
ALTER TABLE "bookmarkable" ADD COLUMN     "type" "BookmarkType" NOT NULL;
