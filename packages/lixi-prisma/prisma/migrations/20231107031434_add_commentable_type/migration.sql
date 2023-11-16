/*
  Warnings:

  - Added the required column `type` to the `commentable` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "commentable" ADD COLUMN     "type" TEXT NOT NULL;
