/*
  Warnings:

  - You are about to drop the column `address_hash_160` on the `account` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "account" DROP COLUMN "address_hash_160",
ADD COLUMN     "hash_160" BYTEA NOT NULL DEFAULT '\x';
