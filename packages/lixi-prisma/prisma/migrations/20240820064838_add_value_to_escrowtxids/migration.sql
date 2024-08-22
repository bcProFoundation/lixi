/*
  Warnings:

  - Added the required column `value` to the `EscrowTxId` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "EscrowTxId" ADD COLUMN     "value" BIGINT NOT NULL;
