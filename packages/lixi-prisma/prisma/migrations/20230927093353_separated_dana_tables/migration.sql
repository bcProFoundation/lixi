/*
  Warnings:

  - You are about to drop the column `created_at` on the `account_dana` table. All the data in the column will be lost.
  - You are about to drop the column `updated_at` on the `account_dana` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "account_dana" DROP COLUMN "created_at",
DROP COLUMN "updated_at";

-- CreateTable
CREATE TABLE "token_dana" (
    "dana_burn_up" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "dana_burn_down" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "dana_burn_score" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "token_id" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "page_dana" (
    "dana_burn_up" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "dana_burn_down" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "dana_burn_score" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "page_id" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "post_dana" (
    "dana_burn_up" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "dana_burn_down" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "dana_burn_score" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "post_id" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "comment_dana" (
    "dana_burn_up" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "dana_burn_down" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "dana_burn_score" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "comment_id" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "hashtag_dana" (
    "dana_burn_up" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "dana_burn_down" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "dana_burn_score" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "hashtag_id" TEXT NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "token_dana_token_id_key" ON "token_dana"("token_id");

-- CreateIndex
CREATE INDEX "token_dana_token_id_idx" ON "token_dana"("token_id");

-- CreateIndex
CREATE UNIQUE INDEX "page_dana_page_id_key" ON "page_dana"("page_id");

-- CreateIndex
CREATE INDEX "page_dana_page_id_idx" ON "page_dana"("page_id");

-- CreateIndex
CREATE UNIQUE INDEX "post_dana_post_id_key" ON "post_dana"("post_id");

-- CreateIndex
CREATE INDEX "post_dana_post_id_idx" ON "post_dana"("post_id");

-- CreateIndex
CREATE UNIQUE INDEX "comment_dana_comment_id_key" ON "comment_dana"("comment_id");

-- CreateIndex
CREATE INDEX "comment_dana_comment_id_idx" ON "comment_dana"("comment_id");

-- CreateIndex
CREATE UNIQUE INDEX "hashtag_dana_hashtag_id_key" ON "hashtag_dana"("hashtag_id");

-- CreateIndex
CREATE INDEX "hashtag_dana_hashtag_id_idx" ON "hashtag_dana"("hashtag_id");

-- AddForeignKey
ALTER TABLE "token_dana" ADD CONSTRAINT "token_dana_token_id_fkey" FOREIGN KEY ("token_id") REFERENCES "token"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "page_dana" ADD CONSTRAINT "page_dana_page_id_fkey" FOREIGN KEY ("page_id") REFERENCES "page"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "post_dana" ADD CONSTRAINT "post_dana_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "post"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comment_dana" ADD CONSTRAINT "comment_dana_comment_id_fkey" FOREIGN KEY ("comment_id") REFERENCES "comment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hashtag_dana" ADD CONSTRAINT "hashtag_dana_hashtag_id_fkey" FOREIGN KEY ("hashtag_id") REFERENCES "hashtag"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
