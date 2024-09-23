-- CreateEnum
CREATE TYPE "AccountType" AS ENUM ('NORMAL', 'NONCUSTODIAL');

-- AlterTable
ALTER TABLE "account" ADD COLUMN     "account_type" "AccountType" NOT NULL DEFAULT 'NORMAL';
