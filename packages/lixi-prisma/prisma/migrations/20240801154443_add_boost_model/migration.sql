/*
  Warnings:

  - The primary key for the `offer` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `id` on the `offer` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[postId]` on the table `offer` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `postId` to the `offer` table without a default value. This is not possible if the table is not empty.

*/
-- AlterEnum
ALTER TYPE "comment_type" ADD VALUE 'OFFER';

-- AlterEnum
ALTER TYPE "post_type" ADD VALUE 'OFFER';

-- DropForeignKey
ALTER TABLE "escrow_order" DROP CONSTRAINT "escrow_order_offer_id_fkey";

-- DropForeignKey
ALTER TABLE "offer_payment_method" DROP CONSTRAINT "offer_payment_method_offer_id_fkey";

-- AlterTable
ALTER TABLE "offer" DROP CONSTRAINT "offer_pkey",
DROP COLUMN "id",
ADD COLUMN     "postId" TEXT NOT NULL;

-- CreateTable
CREATE TABLE "post_boost_score" (
    "boost_received_up" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "boost_received_down" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "boost_received_score" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "boost_up" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "boost_down" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "boost_score" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "post_id" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 0
);

-- CreateTable
CREATE TABLE "boost_fee" (
    "id" TEXT NOT NULL,
    "txid" TEXT NOT NULL,
    "boost_type" BOOLEAN NOT NULL,
    "boost_for_type" INTEGER NOT NULL,
    "boosted_by_hash" TEXT NOT NULL,
    "boosted_for_id" TEXT NOT NULL,
    "boosted_value" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "boost_fee_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "post_boost_score_post_id_key" ON "post_boost_score"("post_id");

-- CreateIndex
CREATE INDEX "post_boost_score_post_id_idx" ON "post_boost_score"("post_id");

-- CreateIndex
CREATE UNIQUE INDEX "offer_postId_key" ON "offer"("postId");

-- AddForeignKey
ALTER TABLE "post_boost_score" ADD CONSTRAINT "post_boost_score_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "post"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "escrow_order" ADD CONSTRAINT "escrow_order_offer_id_fkey" FOREIGN KEY ("offer_id") REFERENCES "offer"("postId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "offer" ADD CONSTRAINT "offer_postId_fkey" FOREIGN KEY ("postId") REFERENCES "post"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "offer_payment_method" ADD CONSTRAINT "offer_payment_method_offer_id_fkey" FOREIGN KEY ("offer_id") REFERENCES "offer"("postId") ON DELETE RESTRICT ON UPDATE CASCADE;
