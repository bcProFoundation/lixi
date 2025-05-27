-- CreateEnum
CREATE TYPE "EscrowTxIdType" AS ENUM ('ESCROW', 'FEE');

-- AlterTable
ALTER TABLE "EscrowTxId" ADD COLUMN     "type" "EscrowTxIdType";
