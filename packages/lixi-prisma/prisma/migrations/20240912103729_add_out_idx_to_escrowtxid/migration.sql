/*
  Warnings:

  - Added the required column `outIdx` to the `EscrowTxId` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "EscrowTxId" ADD COLUMN     "outIdx" INTEGER NOT NULL;
