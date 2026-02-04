/*
  Warnings:

  - You are about to drop the column `payment_type_goods_services` on the `offer` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "offer" DROP COLUMN "payment_type_goods_services",
ADD COLUMN     "offer_category" TEXT;
