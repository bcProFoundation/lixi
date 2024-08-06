/*
  Warnings:

  - You are about to drop the column `moderator_public_key` on the `escrow_order` table. All the data in the column will be lost.

*/
-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "EscrowOrderStatus" ADD VALUE 'PENDING';
ALTER TYPE "EscrowOrderStatus" ADD VALUE 'CANCEL';

-- AlterTable
ALTER TABLE "account" ALTER COLUMN "encrypted_mnemonic" DROP NOT NULL,
ALTER COLUMN "encrypted_secret" DROP NOT NULL,
ALTER COLUMN "mnemonic_hash" DROP NOT NULL;

-- AlterTable
ALTER TABLE "escrow_order" DROP COLUMN "moderator_public_key";
