/*
  Warnings:

  - The primary key for the `event` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `account_id` on the `event` table. All the data in the column will be lost.
  - You are about to drop the column `bookmarkable_id` on the `event` table. All the data in the column will be lost.
  - You are about to drop the column `commentable_id` on the `event` table. All the data in the column will be lost.
  - You are about to drop the column `create_fee` on the `event` table. All the data in the column will be lost.
  - You are about to drop the column `created_at` on the `event` table. All the data in the column will be lost.
  - You are about to drop the column `event_image_uploadable_id` on the `event` table. All the data in the column will be lost.
  - You are about to drop the column `id` on the `event` table. All the data in the column will be lost.
  - You are about to drop the column `page_id` on the `event` table. All the data in the column will be lost.
  - You are about to drop the column `taggableId` on the `event` table. All the data in the column will be lost.
  - You are about to drop the column `txid` on the `event` table. All the data in the column will be lost.
  - You are about to drop the column `updated_at` on the `event` table. All the data in the column will be lost.
  - The primary key for the `poll` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `account_id` on the `poll` table. All the data in the column will be lost.
  - You are about to drop the column `bookmarkable_id` on the `poll` table. All the data in the column will be lost.
  - You are about to drop the column `commentable_id` on the `poll` table. All the data in the column will be lost.
  - You are about to drop the column `create_fee` on the `poll` table. All the data in the column will be lost.
  - You are about to drop the column `created_at` on the `poll` table. All the data in the column will be lost.
  - You are about to drop the column `id` on the `poll` table. All the data in the column will be lost.
  - You are about to drop the column `page_id` on the `poll` table. All the data in the column will be lost.
  - You are about to drop the column `poll_image_uploadable_id` on the `poll` table. All the data in the column will be lost.
  - You are about to drop the column `taggableId` on the `poll` table. All the data in the column will be lost.
  - You are about to drop the column `txid` on the `poll` table. All the data in the column will be lost.
  - You are about to drop the column `updated_at` on the `poll` table. All the data in the column will be lost.
  - The primary key for the `product` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `bookmarkable_id` on the `product` table. All the data in the column will be lost.
  - You are about to drop the column `commentable_id` on the `product` table. All the data in the column will be lost.
  - You are about to drop the column `create_fee` on the `product` table. All the data in the column will be lost.
  - You are about to drop the column `created_at` on the `product` table. All the data in the column will be lost.
  - You are about to drop the column `id` on the `product` table. All the data in the column will be lost.
  - You are about to drop the column `page_id` on the `product` table. All the data in the column will be lost.
  - You are about to drop the column `product_image_uploadable_id` on the `product` table. All the data in the column will be lost.
  - You are about to drop the column `taggableId` on the `product` table. All the data in the column will be lost.
  - You are about to drop the column `txid` on the `product` table. All the data in the column will be lost.
  - You are about to drop the column `updated_at` on the `product` table. All the data in the column will be lost.
  - You are about to drop the `event_dana` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `poll_dana` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `product_dana` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[postId]` on the table `event` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[postId]` on the table `poll` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[postId]` on the table `product` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `postId` to the `event` table without a default value. This is not possible if the table is not empty.
  - Added the required column `postId` to the `poll` table without a default value. This is not possible if the table is not empty.
  - Added the required column `postId` to the `product` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "post_type" AS ENUM ('POST', 'EVENT', 'POLL', 'PRODUCT');

-- DropForeignKey
ALTER TABLE "event" DROP CONSTRAINT "event_account_id_fkey";

-- DropForeignKey
ALTER TABLE "event" DROP CONSTRAINT "event_bookmarkable_id_fkey";

-- DropForeignKey
ALTER TABLE "event" DROP CONSTRAINT "event_commentable_id_fkey";

-- DropForeignKey
ALTER TABLE "event" DROP CONSTRAINT "event_event_image_uploadable_id_fkey";

-- DropForeignKey
ALTER TABLE "event" DROP CONSTRAINT "event_page_id_fkey";

-- DropForeignKey
ALTER TABLE "event" DROP CONSTRAINT "event_taggableId_fkey";

-- DropForeignKey
ALTER TABLE "event_dana" DROP CONSTRAINT "event_dana_event_id_fkey";

-- DropForeignKey
ALTER TABLE "poll" DROP CONSTRAINT "poll_account_id_fkey";

-- DropForeignKey
ALTER TABLE "poll" DROP CONSTRAINT "poll_bookmarkable_id_fkey";

-- DropForeignKey
ALTER TABLE "poll" DROP CONSTRAINT "poll_commentable_id_fkey";

-- DropForeignKey
ALTER TABLE "poll" DROP CONSTRAINT "poll_page_id_fkey";

-- DropForeignKey
ALTER TABLE "poll" DROP CONSTRAINT "poll_poll_image_uploadable_id_fkey";

-- DropForeignKey
ALTER TABLE "poll" DROP CONSTRAINT "poll_taggableId_fkey";

-- DropForeignKey
ALTER TABLE "poll_dana" DROP CONSTRAINT "poll_dana_poll_id_fkey";

-- DropForeignKey
ALTER TABLE "poll_option" DROP CONSTRAINT "poll_option_poll_id_fkey";

-- DropForeignKey
ALTER TABLE "product" DROP CONSTRAINT "product_bookmarkable_id_fkey";

-- DropForeignKey
ALTER TABLE "product" DROP CONSTRAINT "product_commentable_id_fkey";

-- DropForeignKey
ALTER TABLE "product" DROP CONSTRAINT "product_page_id_fkey";

-- DropForeignKey
ALTER TABLE "product" DROP CONSTRAINT "product_product_image_uploadable_id_fkey";

-- DropForeignKey
ALTER TABLE "product" DROP CONSTRAINT "product_taggableId_fkey";

-- DropForeignKey
ALTER TABLE "product_dana" DROP CONSTRAINT "product_dana_poll_id_fkey";

-- DropIndex
DROP INDEX "event_account_id_idx";

-- DropIndex
DROP INDEX "event_commentable_id_idx";

-- DropIndex
DROP INDEX "event_commentable_id_key";

-- DropIndex
DROP INDEX "event_event_image_uploadable_id_key";

-- DropIndex
DROP INDEX "event_page_id_idx";

-- DropIndex
DROP INDEX "poll_account_id_idx";

-- DropIndex
DROP INDEX "poll_commentable_id_idx";

-- DropIndex
DROP INDEX "poll_commentable_id_key";

-- DropIndex
DROP INDEX "poll_page_id_idx";

-- DropIndex
DROP INDEX "poll_poll_image_uploadable_id_key";

-- DropIndex
DROP INDEX "product_commentable_id_key";

-- DropIndex
DROP INDEX "product_product_image_uploadable_id_key";

-- AlterTable
ALTER TABLE "event" DROP CONSTRAINT "event_pkey",
DROP COLUMN "account_id",
DROP COLUMN "bookmarkable_id",
DROP COLUMN "commentable_id",
DROP COLUMN "create_fee",
DROP COLUMN "created_at",
DROP COLUMN "event_image_uploadable_id",
DROP COLUMN "id",
DROP COLUMN "page_id",
DROP COLUMN "taggableId",
DROP COLUMN "txid",
DROP COLUMN "updated_at",
ADD COLUMN     "postId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "poll" DROP CONSTRAINT "poll_pkey",
DROP COLUMN "account_id",
DROP COLUMN "bookmarkable_id",
DROP COLUMN "commentable_id",
DROP COLUMN "create_fee",
DROP COLUMN "created_at",
DROP COLUMN "id",
DROP COLUMN "page_id",
DROP COLUMN "poll_image_uploadable_id",
DROP COLUMN "taggableId",
DROP COLUMN "txid",
DROP COLUMN "updated_at",
ADD COLUMN     "postId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "post" ADD COLUMN     "type" "post_type" NOT NULL DEFAULT 'POST';

-- AlterTable
ALTER TABLE "product" DROP CONSTRAINT "product_pkey",
DROP COLUMN "bookmarkable_id",
DROP COLUMN "commentable_id",
DROP COLUMN "create_fee",
DROP COLUMN "created_at",
DROP COLUMN "id",
DROP COLUMN "page_id",
DROP COLUMN "product_image_uploadable_id",
DROP COLUMN "taggableId",
DROP COLUMN "txid",
DROP COLUMN "updated_at",
ADD COLUMN     "postId" TEXT NOT NULL;

-- DropTable
DROP TABLE "event_dana";

-- DropTable
DROP TABLE "poll_dana";

-- DropTable
DROP TABLE "product_dana";

-- CreateIndex
CREATE UNIQUE INDEX "event_postId_key" ON "event"("postId");

-- CreateIndex
CREATE INDEX "event_postId_idx" ON "event"("postId");

-- CreateIndex
CREATE UNIQUE INDEX "poll_postId_key" ON "poll"("postId");

-- CreateIndex
CREATE INDEX "poll_postId_idx" ON "poll"("postId");

-- CreateIndex
CREATE UNIQUE INDEX "product_postId_key" ON "product"("postId");

-- CreateIndex
CREATE INDEX "product_postId_idx" ON "product"("postId");

-- AddForeignKey
ALTER TABLE "event" ADD CONSTRAINT "event_postId_fkey" FOREIGN KEY ("postId") REFERENCES "post"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "poll_option" ADD CONSTRAINT "poll_option_poll_id_fkey" FOREIGN KEY ("poll_id") REFERENCES "poll"("postId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "poll" ADD CONSTRAINT "poll_postId_fkey" FOREIGN KEY ("postId") REFERENCES "post"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product" ADD CONSTRAINT "product_postId_fkey" FOREIGN KEY ("postId") REFERENCES "post"("id") ON DELETE CASCADE ON UPDATE CASCADE;
