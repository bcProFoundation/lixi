/*
  Warnings:

  - Added the required column `moderator_public_key` to the `escrow_order` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "escrow_order" ADD COLUMN     "moderator_public_key" TEXT NOT NULL;
