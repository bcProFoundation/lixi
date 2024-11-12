/*
  Warnings:

  - You are about to drop the column `telegram_message_id` on the `escrow_order` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "escrow_order" DROP COLUMN "telegram_message_id",
ADD COLUMN     "buyer_telegram_message_id" INTEGER,
ADD COLUMN     "seller_telegram_message_id" INTEGER;
