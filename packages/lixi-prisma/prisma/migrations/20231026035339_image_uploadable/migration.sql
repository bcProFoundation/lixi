/*
  Warnings:

  - You are about to drop the column `avatar_image_uploadable_id` on the `Temple` table. All the data in the column will be lost.
  - You are about to drop the column `cover_image_uploadable_id` on the `Temple` table. All the data in the column will be lost.
  - You are about to drop the column `avatar_image_uploadable_id` on the `account` table. All the data in the column will be lost.
  - You are about to drop the column `cover_image_uploadable_id` on the `account` table. All the data in the column will be lost.
  - You are about to drop the column `image_uploadable_id` on the `comment` table. All the data in the column will be lost.
  - You are about to drop the column `image_uploadable_id` on the `event` table. All the data in the column will be lost.
  - You are about to drop the column `image_uploadable_id` on the `lixi` table. All the data in the column will be lost.
  - You are about to drop the column `avatar_image_uploadable_id` on the `page` table. All the data in the column will be lost.
  - You are about to drop the column `cover_image_uploadable_id` on the `page` table. All the data in the column will be lost.
  - You are about to drop the column `image_uploadable_id` on the `poll` table. All the data in the column will be lost.
  - You are about to drop the column `avatar_image_uploadable_id` on the `post` table. All the data in the column will be lost.
  - You are about to drop the column `cover_image_uploadable_id` on the `post` table. All the data in the column will be lost.
  - You are about to drop the column `image_uploadable_id` on the `post` table. All the data in the column will be lost.
  - You are about to drop the column `image_uploadable_id` on the `product` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[temple_avatar_image_uploadable_id]` on the table `Temple` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[temple_cover_image_uploadable_id]` on the table `Temple` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[account_avatar_image_uploadable_id]` on the table `account` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[account_cover_image_uploadable_id]` on the table `account` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[comment_image_uploadable_id]` on the table `comment` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[event_image_uploadable_id]` on the table `event` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[lixi_image_uploadable_id]` on the table `lixi` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[image_uploadable_id]` on the table `message` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[page_avatar_image_uploadable_id]` on the table `page` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[page_cover_image_uploadable_id]` on the table `page` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[poll_image_uploadable_id]` on the table `poll` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[post_image_uploadable_id]` on the table `post` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[product_image_uploadable_id]` on the table `product` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `account_id` to the `image_uploadable` table without a default value. This is not possible if the table is not empty.
  - Added the required column `product_image_uploadable_id` to the `product` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "image_uploadable_type" AS ENUM ('ACCOUNT_AVATAR', 'ACCOUNT_COVER', 'PAGE_AVATAR', 'PAGE_COVER', 'POST', 'COMMENT', 'LIXI', 'TEMPLE_AVATAR', 'TEMPLE_COVER', 'MESSAGE', 'EVENT', 'POLL', 'PRODUCT');

-- DropForeignKey
ALTER TABLE "Temple" DROP CONSTRAINT "Temple_avatar_image_uploadable_id_fkey";

-- DropForeignKey
ALTER TABLE "Temple" DROP CONSTRAINT "Temple_cover_image_uploadable_id_fkey";

-- DropForeignKey
ALTER TABLE "account" DROP CONSTRAINT "account_avatar_image_uploadable_id_fkey";

-- DropForeignKey
ALTER TABLE "account" DROP CONSTRAINT "account_cover_image_uploadable_id_fkey";

-- DropForeignKey
ALTER TABLE "comment" DROP CONSTRAINT "comment_image_uploadable_id_fkey";

-- DropForeignKey
ALTER TABLE "event" DROP CONSTRAINT "event_image_uploadable_id_fkey";

-- DropForeignKey
ALTER TABLE "lixi" DROP CONSTRAINT "lixi_image_uploadable_id_fkey";

-- DropForeignKey
ALTER TABLE "page" DROP CONSTRAINT "page_avatar_image_uploadable_id_fkey";

-- DropForeignKey
ALTER TABLE "page" DROP CONSTRAINT "page_cover_image_uploadable_id_fkey";

-- DropForeignKey
ALTER TABLE "poll" DROP CONSTRAINT "poll_image_uploadable_id_fkey";

-- DropForeignKey
ALTER TABLE "post" DROP CONSTRAINT "post_avatar_image_uploadable_id_fkey";

-- DropForeignKey
ALTER TABLE "post" DROP CONSTRAINT "post_cover_image_uploadable_id_fkey";

-- DropForeignKey
ALTER TABLE "post" DROP CONSTRAINT "post_image_uploadable_id_fkey";

-- DropForeignKey
ALTER TABLE "product" DROP CONSTRAINT "product_image_uploadable_id_fkey";

-- DropIndex
DROP INDEX "Temple_avatar_image_uploadable_id_key";

-- DropIndex
DROP INDEX "Temple_cover_image_uploadable_id_key";

-- DropIndex
DROP INDEX "account_avatar_image_uploadable_id_key";

-- DropIndex
DROP INDEX "account_cover_image_uploadable_id_key";

-- DropIndex
DROP INDEX "lixi_image_uploadable_id_key";

-- DropIndex
DROP INDEX "page_avatar_image_uploadable_id_key";

-- DropIndex
DROP INDEX "page_cover_image_uploadable_id_key";

-- DropIndex
DROP INDEX "post_avatar_image_uploadable_id_key";

-- DropIndex
DROP INDEX "post_cover_image_uploadable_id_key";

-- AlterTable
ALTER TABLE "Temple" DROP COLUMN "avatar_image_uploadable_id",
DROP COLUMN "cover_image_uploadable_id",
ADD COLUMN     "temple_avatar_image_uploadable_id" TEXT,
ADD COLUMN     "temple_cover_image_uploadable_id" TEXT;

-- AlterTable
ALTER TABLE "account" DROP COLUMN "avatar_image_uploadable_id",
DROP COLUMN "cover_image_uploadable_id",
ADD COLUMN     "account_avatar_image_uploadable_id" TEXT,
ADD COLUMN     "account_cover_image_uploadable_id" TEXT;

-- AlterTable
ALTER TABLE "comment" DROP COLUMN "image_uploadable_id",
ADD COLUMN     "comment_image_uploadable_id" TEXT;

-- AlterTable
ALTER TABLE "event" DROP COLUMN "image_uploadable_id",
ADD COLUMN     "event_image_uploadable_id" TEXT;

-- AlterTable
ALTER TABLE "image_uploadable" ADD COLUMN     "account_id" INTEGER NOT NULL,
ADD COLUMN     "image_uploadable_type" "image_uploadable_type";

-- AlterTable
ALTER TABLE "lixi" DROP COLUMN "image_uploadable_id",
ADD COLUMN     "lixi_image_uploadable_id" TEXT;

-- AlterTable
ALTER TABLE "page" DROP COLUMN "avatar_image_uploadable_id",
DROP COLUMN "cover_image_uploadable_id",
ADD COLUMN     "page_avatar_image_uploadable_id" TEXT,
ADD COLUMN     "page_cover_image_uploadable_id" TEXT;

-- AlterTable
ALTER TABLE "poll" DROP COLUMN "image_uploadable_id",
ADD COLUMN     "poll_image_uploadable_id" TEXT;

-- AlterTable
ALTER TABLE "post" DROP COLUMN "avatar_image_uploadable_id",
DROP COLUMN "cover_image_uploadable_id",
DROP COLUMN "image_uploadable_id",
ADD COLUMN     "post_image_uploadable_id" TEXT;

-- AlterTable
ALTER TABLE "product" DROP COLUMN "image_uploadable_id",
ADD COLUMN     "product_image_uploadable_id" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Temple_temple_avatar_image_uploadable_id_key" ON "Temple"("temple_avatar_image_uploadable_id");

-- CreateIndex
CREATE UNIQUE INDEX "Temple_temple_cover_image_uploadable_id_key" ON "Temple"("temple_cover_image_uploadable_id");

-- CreateIndex
CREATE UNIQUE INDEX "account_account_avatar_image_uploadable_id_key" ON "account"("account_avatar_image_uploadable_id");

-- CreateIndex
CREATE UNIQUE INDEX "account_account_cover_image_uploadable_id_key" ON "account"("account_cover_image_uploadable_id");

-- CreateIndex
CREATE UNIQUE INDEX "comment_comment_image_uploadable_id_key" ON "comment"("comment_image_uploadable_id");

-- CreateIndex
CREATE UNIQUE INDEX "event_event_image_uploadable_id_key" ON "event"("event_image_uploadable_id");

-- CreateIndex
CREATE INDEX "image_uploadable_account_id_image_uploadable_type_idx" ON "image_uploadable"("account_id", "image_uploadable_type");

-- CreateIndex
CREATE UNIQUE INDEX "lixi_lixi_image_uploadable_id_key" ON "lixi"("lixi_image_uploadable_id");

-- CreateIndex
CREATE UNIQUE INDEX "message_image_uploadable_id_key" ON "message"("image_uploadable_id");

-- CreateIndex
CREATE UNIQUE INDEX "page_page_avatar_image_uploadable_id_key" ON "page"("page_avatar_image_uploadable_id");

-- CreateIndex
CREATE UNIQUE INDEX "page_page_cover_image_uploadable_id_key" ON "page"("page_cover_image_uploadable_id");

-- CreateIndex
CREATE UNIQUE INDEX "poll_poll_image_uploadable_id_key" ON "poll"("poll_image_uploadable_id");

-- CreateIndex
CREATE UNIQUE INDEX "post_post_image_uploadable_id_key" ON "post"("post_image_uploadable_id");

-- CreateIndex
CREATE UNIQUE INDEX "product_product_image_uploadable_id_key" ON "product"("product_image_uploadable_id");

-- AddForeignKey
ALTER TABLE "page" ADD CONSTRAINT "page_page_avatar_image_uploadable_id_fkey" FOREIGN KEY ("page_avatar_image_uploadable_id") REFERENCES "image_uploadable"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "page" ADD CONSTRAINT "page_page_cover_image_uploadable_id_fkey" FOREIGN KEY ("page_cover_image_uploadable_id") REFERENCES "image_uploadable"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "post" ADD CONSTRAINT "post_post_image_uploadable_id_fkey" FOREIGN KEY ("post_image_uploadable_id") REFERENCES "image_uploadable"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comment" ADD CONSTRAINT "comment_comment_image_uploadable_id_fkey" FOREIGN KEY ("comment_image_uploadable_id") REFERENCES "image_uploadable"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "account" ADD CONSTRAINT "account_account_avatar_image_uploadable_id_fkey" FOREIGN KEY ("account_avatar_image_uploadable_id") REFERENCES "image_uploadable"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "account" ADD CONSTRAINT "account_account_cover_image_uploadable_id_fkey" FOREIGN KEY ("account_cover_image_uploadable_id") REFERENCES "image_uploadable"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lixi" ADD CONSTRAINT "lixi_lixi_image_uploadable_id_fkey" FOREIGN KEY ("lixi_image_uploadable_id") REFERENCES "image_uploadable"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "image_uploadable" ADD CONSTRAINT "image_uploadable_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Temple" ADD CONSTRAINT "Temple_temple_avatar_image_uploadable_id_fkey" FOREIGN KEY ("temple_avatar_image_uploadable_id") REFERENCES "image_uploadable"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Temple" ADD CONSTRAINT "Temple_temple_cover_image_uploadable_id_fkey" FOREIGN KEY ("temple_cover_image_uploadable_id") REFERENCES "image_uploadable"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event" ADD CONSTRAINT "event_event_image_uploadable_id_fkey" FOREIGN KEY ("event_image_uploadable_id") REFERENCES "image_uploadable"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "poll" ADD CONSTRAINT "poll_poll_image_uploadable_id_fkey" FOREIGN KEY ("poll_image_uploadable_id") REFERENCES "image_uploadable"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product" ADD CONSTRAINT "product_product_image_uploadable_id_fkey" FOREIGN KEY ("product_image_uploadable_id") REFERENCES "image_uploadable"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
