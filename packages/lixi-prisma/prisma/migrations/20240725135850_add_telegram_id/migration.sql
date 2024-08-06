/*
  Warnings:

  - A unique constraint covering the columns `[telegram_id]` on the table `account` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "account" ADD COLUMN     "telegram_id" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "account_telegram_id_key" ON "account"("telegram_id");
