/*
  Warnings:

  - You are about to drop the column `bookmark_id` on the `bookmark` table. All the data in the column will be lost.
  - You are about to drop the column `type` on the `bookmark` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[avatar_image_uploadable_id]` on the table `Temple` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[cover_image_uploadable_id]` on the table `Temple` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[avatar_image_uploadable_id]` on the table `account` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[cover_image_uploadable_id]` on the table `account` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[image_uploadable_id]` on the table `lixi` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[avatar_image_uploadable_id]` on the table `page` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[cover_image_uploadable_id]` on the table `page` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[avatar_image_uploadable_id]` on the table `post` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[cover_image_uploadable_id]` on the table `post` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `bookmarkable_id` to the `bookmark` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "EventType" AS ENUM ('VIRTUAL', 'PHYSICAL');

-- DropForeignKey
ALTER TABLE "comment" DROP CONSTRAINT "comment_comment_to_id_fkey";

-- AlterTable
ALTER TABLE "Temple" ADD COLUMN     "avatar_image_uploadable_id" TEXT,
ADD COLUMN     "cover_image_uploadable_id" TEXT;

-- AlterTable
ALTER TABLE "account" ADD COLUMN     "avatar_image_uploadable_id" TEXT,
ADD COLUMN     "cover_image_uploadable_id" TEXT;

-- AlterTable
ALTER TABLE "account_dana" ADD COLUMN     "dana_received_down" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
ADD COLUMN     "dana_received_score" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
ADD COLUMN     "dana_received_up" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
ADD COLUMN     "version" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "bookmark" DROP COLUMN "bookmark_id",
DROP COLUMN "type",
ADD COLUMN     "bookmarkable_id" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "comment" ADD COLUMN     "commentable_id" TEXT,
ADD COLUMN     "image_uploadable_id" TEXT;

-- AlterTable
ALTER TABLE "comment_dana" ADD COLUMN     "version" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "hashtag_dana" ADD COLUMN     "dana_received_down" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
ADD COLUMN     "dana_received_score" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
ADD COLUMN     "dana_received_up" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
ADD COLUMN     "version" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "lixi" ADD COLUMN     "image_uploadable_id" TEXT;

-- AlterTable
ALTER TABLE "message" ADD COLUMN     "image_uploadable_id" TEXT;

-- AlterTable
ALTER TABLE "page" ADD COLUMN     "avatar_image_uploadable_id" TEXT,
ADD COLUMN     "cover_image_uploadable_id" TEXT;

-- AlterTable
ALTER TABLE "page_dana" ADD COLUMN     "dana_received_down" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
ADD COLUMN     "dana_received_score" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
ADD COLUMN     "dana_received_up" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
ADD COLUMN     "version" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "post" ADD COLUMN     "avatar_image_uploadable_id" TEXT,
ADD COLUMN     "bookmarkable_id" TEXT,
ADD COLUMN     "commentable_id" TEXT,
ADD COLUMN     "cover_image_uploadable_id" TEXT,
ADD COLUMN     "image_uploadable_id" TEXT,
ADD COLUMN     "taggableId" TEXT;

-- AlterTable
ALTER TABLE "post_dana" ADD COLUMN     "dana_received_down" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
ADD COLUMN     "dana_received_score" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
ADD COLUMN     "dana_received_up" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
ADD COLUMN     "version" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "token_dana" ADD COLUMN     "dana_received_down" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
ADD COLUMN     "dana_received_score" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
ADD COLUMN     "dana_received_up" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
ADD COLUMN     "version" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "upload" ADD COLUMN     "image_uploadable_id" TEXT;

-- CreateTable
CREATE TABLE "commentable" (
    "id" TEXT NOT NULL,

    CONSTRAINT "commentable_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "image_uploadable" (
    "id" TEXT NOT NULL,

    CONSTRAINT "image_uploadable_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "taggable" (
    "id" TEXT NOT NULL,

    CONSTRAINT "taggable_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tagset" (
    "id" TEXT NOT NULL,
    "taggableId" TEXT NOT NULL,
    "hashtagId" TEXT NOT NULL,

    CONSTRAINT "tagset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "repost_dana" (
    "dana_burn_up" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "dana_burn_down" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "dana_burn_score" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "repost_id" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 0
);

-- CreateTable
CREATE TABLE "bookmarkable" (
    "id" TEXT NOT NULL,
    "type" "BookmarkType" NOT NULL,

    CONSTRAINT "bookmarkable_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "event" (
    "id" TEXT NOT NULL,
    "post_account_id" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "page_id" TEXT,
    "start_date" TIMESTAMPTZ NOT NULL,
    "end_date" TIMESTAMPTZ NOT NULL,
    "location" TEXT,
    "commentable_id" TEXT,
    "bookmarkable_id" TEXT,
    "taggableId" TEXT NOT NULL,
    "eventType" "EventType" NOT NULL,
    "image_uploadable_id" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "event_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "event_dana" (
    "dana_received_up" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "dana_received_down" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "dana_received_score" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "dana_burn_up" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "dana_burn_down" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "dana_burn_score" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "event_id" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 0
);

-- CreateTable
CREATE TABLE "poll_option" (
    "id" TEXT NOT NULL,
    "poll_id" TEXT NOT NULL,
    "option" TEXT NOT NULL,

    CONSTRAINT "poll_option_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pollawnswer_on_account" (
    "account_id" INTEGER NOT NULL,
    "poll_option_id" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "poll_dana_score" DOUBLE PRECISION NOT NULL DEFAULT 0.0,

    CONSTRAINT "pollawnswer_on_account_pkey" PRIMARY KEY ("poll_option_id","account_id")
);

-- CreateTable
CREATE TABLE "poll" (
    "id" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "page_id" TEXT,
    "start_date" TIMESTAMPTZ NOT NULL,
    "end_date" TIMESTAMPTZ NOT NULL,
    "commentable_id" TEXT,
    "bookmarkable_id" TEXT,
    "taggableId" TEXT,
    "image_uploadable_id" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "poll_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "poll_dana" (
    "dana_received_up" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "dana_received_down" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "dana_received_score" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "dana_burn_up" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "dana_burn_down" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "dana_burn_score" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "poll_id" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 0
);

-- CreateTable
CREATE TABLE "product" (
    "id" TEXT NOT NULL,
    "page_id" TEXT NOT NULL,
    "title" VARCHAR(255) NOT NULL DEFAULT '',
    "price" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "price_unit" TEXT NOT NULL DEFAULT 'VND',
    "phone_number" TEXT NOT NULL DEFAULT '',
    "category_id" INTEGER,
    "description" VARCHAR(1000) NOT NULL DEFAULT '',
    "country_id" INTEGER,
    "state_id" INTEGER,
    "address" TEXT DEFAULT '',
    "commentable_id" TEXT,
    "bookmarkable_id" TEXT,
    "taggableId" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "image_uploadable_id" TEXT NOT NULL,

    CONSTRAINT "product_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_dana" (
    "dana_received_up" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "dana_received_down" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "dana_received_score" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "dana_burn_up" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "dana_burn_down" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "dana_burn_score" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "poll_id" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 0
);

-- CreateIndex
CREATE UNIQUE INDEX "repost_dana_repost_id_key" ON "repost_dana"("repost_id");

-- CreateIndex
CREATE INDEX "repost_dana_repost_id_idx" ON "repost_dana"("repost_id");

-- CreateIndex
CREATE UNIQUE INDEX "event_dana_event_id_key" ON "event_dana"("event_id");

-- CreateIndex
CREATE INDEX "event_dana_event_id_idx" ON "event_dana"("event_id");

-- CreateIndex
CREATE UNIQUE INDEX "poll_dana_poll_id_key" ON "poll_dana"("poll_id");

-- CreateIndex
CREATE INDEX "poll_dana_poll_id_idx" ON "poll_dana"("poll_id");

-- CreateIndex
CREATE UNIQUE INDEX "product_dana_poll_id_key" ON "product_dana"("poll_id");

-- CreateIndex
CREATE INDEX "product_dana_poll_id_idx" ON "product_dana"("poll_id");

-- CreateIndex
CREATE UNIQUE INDEX "Temple_avatar_image_uploadable_id_key" ON "Temple"("avatar_image_uploadable_id");

-- CreateIndex
CREATE UNIQUE INDEX "Temple_cover_image_uploadable_id_key" ON "Temple"("cover_image_uploadable_id");

-- CreateIndex
CREATE UNIQUE INDEX "account_avatar_image_uploadable_id_key" ON "account"("avatar_image_uploadable_id");

-- CreateIndex
CREATE UNIQUE INDEX "account_cover_image_uploadable_id_key" ON "account"("cover_image_uploadable_id");

-- CreateIndex
CREATE INDEX "index_commentable" ON "comment"("commentable_id");

-- CreateIndex
CREATE UNIQUE INDEX "lixi_image_uploadable_id_key" ON "lixi"("image_uploadable_id");

-- CreateIndex
CREATE UNIQUE INDEX "page_avatar_image_uploadable_id_key" ON "page"("avatar_image_uploadable_id");

-- CreateIndex
CREATE UNIQUE INDEX "page_cover_image_uploadable_id_key" ON "page"("cover_image_uploadable_id");

-- CreateIndex
CREATE UNIQUE INDEX "post_avatar_image_uploadable_id_key" ON "post"("avatar_image_uploadable_id");

-- CreateIndex
CREATE UNIQUE INDEX "post_cover_image_uploadable_id_key" ON "post"("cover_image_uploadable_id");

-- CreateIndex
CREATE INDEX "index_image_uploadable" ON "upload"("image_uploadable_id");

-- AddForeignKey
ALTER TABLE "page" ADD CONSTRAINT "page_avatar_image_uploadable_id_fkey" FOREIGN KEY ("avatar_image_uploadable_id") REFERENCES "image_uploadable"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "page" ADD CONSTRAINT "page_cover_image_uploadable_id_fkey" FOREIGN KEY ("cover_image_uploadable_id") REFERENCES "image_uploadable"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "post" ADD CONSTRAINT "post_commentable_id_fkey" FOREIGN KEY ("commentable_id") REFERENCES "commentable"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "post" ADD CONSTRAINT "post_bookmarkable_id_fkey" FOREIGN KEY ("bookmarkable_id") REFERENCES "bookmarkable"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "post" ADD CONSTRAINT "post_taggableId_fkey" FOREIGN KEY ("taggableId") REFERENCES "taggable"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "post" ADD CONSTRAINT "post_avatar_image_uploadable_id_fkey" FOREIGN KEY ("avatar_image_uploadable_id") REFERENCES "image_uploadable"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "post" ADD CONSTRAINT "post_cover_image_uploadable_id_fkey" FOREIGN KEY ("cover_image_uploadable_id") REFERENCES "image_uploadable"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "post" ADD CONSTRAINT "post_image_uploadable_id_fkey" FOREIGN KEY ("image_uploadable_id") REFERENCES "image_uploadable"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comment" ADD CONSTRAINT "comment_commentable_id_fkey" FOREIGN KEY ("commentable_id") REFERENCES "commentable"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comment" ADD CONSTRAINT "comment_image_uploadable_id_fkey" FOREIGN KEY ("image_uploadable_id") REFERENCES "image_uploadable"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "account" ADD CONSTRAINT "account_avatar_image_uploadable_id_fkey" FOREIGN KEY ("avatar_image_uploadable_id") REFERENCES "image_uploadable"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "account" ADD CONSTRAINT "account_cover_image_uploadable_id_fkey" FOREIGN KEY ("cover_image_uploadable_id") REFERENCES "image_uploadable"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lixi" ADD CONSTRAINT "lixi_image_uploadable_id_fkey" FOREIGN KEY ("image_uploadable_id") REFERENCES "image_uploadable"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "upload" ADD CONSTRAINT "upload_image_uploadable_id_fkey" FOREIGN KEY ("image_uploadable_id") REFERENCES "image_uploadable"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Temple" ADD CONSTRAINT "Temple_avatar_image_uploadable_id_fkey" FOREIGN KEY ("avatar_image_uploadable_id") REFERENCES "image_uploadable"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Temple" ADD CONSTRAINT "Temple_cover_image_uploadable_id_fkey" FOREIGN KEY ("cover_image_uploadable_id") REFERENCES "image_uploadable"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tagset" ADD CONSTRAINT "tagset_taggableId_fkey" FOREIGN KEY ("taggableId") REFERENCES "taggable"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tagset" ADD CONSTRAINT "tagset_hashtagId_fkey" FOREIGN KEY ("hashtagId") REFERENCES "hashtag"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "repost_dana" ADD CONSTRAINT "repost_dana_repost_id_fkey" FOREIGN KEY ("repost_id") REFERENCES "repost"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "message" ADD CONSTRAINT "message_image_uploadable_id_fkey" FOREIGN KEY ("image_uploadable_id") REFERENCES "image_uploadable"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookmark" ADD CONSTRAINT "bookmark_bookmarkable_id_fkey" FOREIGN KEY ("bookmarkable_id") REFERENCES "bookmarkable"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event" ADD CONSTRAINT "event_post_account_id_fkey" FOREIGN KEY ("post_account_id") REFERENCES "account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event" ADD CONSTRAINT "event_page_id_fkey" FOREIGN KEY ("page_id") REFERENCES "page"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event" ADD CONSTRAINT "event_commentable_id_fkey" FOREIGN KEY ("commentable_id") REFERENCES "commentable"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event" ADD CONSTRAINT "event_bookmarkable_id_fkey" FOREIGN KEY ("bookmarkable_id") REFERENCES "bookmarkable"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event" ADD CONSTRAINT "event_taggableId_fkey" FOREIGN KEY ("taggableId") REFERENCES "taggable"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event" ADD CONSTRAINT "event_image_uploadable_id_fkey" FOREIGN KEY ("image_uploadable_id") REFERENCES "image_uploadable"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_dana" ADD CONSTRAINT "event_dana_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "event"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "poll_option" ADD CONSTRAINT "poll_option_poll_id_fkey" FOREIGN KEY ("poll_id") REFERENCES "poll"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pollawnswer_on_account" ADD CONSTRAINT "pollawnswer_on_account_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pollawnswer_on_account" ADD CONSTRAINT "pollawnswer_on_account_poll_option_id_fkey" FOREIGN KEY ("poll_option_id") REFERENCES "poll_option"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "poll" ADD CONSTRAINT "poll_page_id_fkey" FOREIGN KEY ("page_id") REFERENCES "page"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "poll" ADD CONSTRAINT "poll_commentable_id_fkey" FOREIGN KEY ("commentable_id") REFERENCES "commentable"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "poll" ADD CONSTRAINT "poll_bookmarkable_id_fkey" FOREIGN KEY ("bookmarkable_id") REFERENCES "bookmarkable"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "poll" ADD CONSTRAINT "poll_taggableId_fkey" FOREIGN KEY ("taggableId") REFERENCES "taggable"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "poll" ADD CONSTRAINT "poll_image_uploadable_id_fkey" FOREIGN KEY ("image_uploadable_id") REFERENCES "image_uploadable"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "poll_dana" ADD CONSTRAINT "poll_dana_poll_id_fkey" FOREIGN KEY ("poll_id") REFERENCES "poll"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product" ADD CONSTRAINT "product_page_id_fkey" FOREIGN KEY ("page_id") REFERENCES "page"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product" ADD CONSTRAINT "product_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "category"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product" ADD CONSTRAINT "product_country_id_fkey" FOREIGN KEY ("country_id") REFERENCES "country"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product" ADD CONSTRAINT "product_state_id_fkey" FOREIGN KEY ("state_id") REFERENCES "state"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product" ADD CONSTRAINT "product_commentable_id_fkey" FOREIGN KEY ("commentable_id") REFERENCES "commentable"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product" ADD CONSTRAINT "product_bookmarkable_id_fkey" FOREIGN KEY ("bookmarkable_id") REFERENCES "bookmarkable"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product" ADD CONSTRAINT "product_taggableId_fkey" FOREIGN KEY ("taggableId") REFERENCES "taggable"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product" ADD CONSTRAINT "product_image_uploadable_id_fkey" FOREIGN KEY ("image_uploadable_id") REFERENCES "image_uploadable"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_dana" ADD CONSTRAINT "product_dana_poll_id_fkey" FOREIGN KEY ("poll_id") REFERENCES "product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
