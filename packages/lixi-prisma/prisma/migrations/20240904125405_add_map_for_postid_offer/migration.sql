/*
  Warnings:

  - You are about to drop the column `postId` on the `offer` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[post_id]` on the table `offer` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `post_id` to the `offer` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "escrow_order" DROP CONSTRAINT "escrow_order_offer_id_fkey";

-- DropForeignKey
ALTER TABLE "offer" DROP CONSTRAINT "offer_postId_fkey";

-- DropForeignKey
ALTER TABLE "offer_payment_method" DROP CONSTRAINT "offer_payment_method_offer_id_fkey";

-- DropIndex
DROP INDEX "offer_postId_key";

-- AlterTable
ALTER TABLE "offer" DROP COLUMN "postId",
ADD COLUMN     "post_id" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "offer_post_id_key" ON "offer"("post_id");

-- AddForeignKey
ALTER TABLE "escrow_order" ADD CONSTRAINT "escrow_order_offer_id_fkey" FOREIGN KEY ("offer_id") REFERENCES "offer"("post_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "offer" ADD CONSTRAINT "offer_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "post"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "offer_payment_method" ADD CONSTRAINT "offer_payment_method_offer_id_fkey" FOREIGN KEY ("offer_id") REFERENCES "offer"("post_id") ON DELETE RESTRICT ON UPDATE CASCADE;
