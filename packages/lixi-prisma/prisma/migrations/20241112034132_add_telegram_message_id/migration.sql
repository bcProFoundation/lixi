-- AlterTable
ALTER TABLE "escrow_order" ADD COLUMN     "telegram_message_id" TEXT;

-- AlterTable
ALTER TABLE "offer" ADD COLUMN     "telegram_message_id" TEXT;
