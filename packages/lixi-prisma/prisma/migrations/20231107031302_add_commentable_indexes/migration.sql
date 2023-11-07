/*
  Warnings:

  - A unique constraint covering the columns `[commentable_id]` on the table `event` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[commentable_id]` on the table `poll` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[commentable_id]` on the table `post` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[commentable_id]` on the table `product` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "event_commentable_id_key" ON "event"("commentable_id");

-- CreateIndex
CREATE UNIQUE INDEX "poll_commentable_id_key" ON "poll"("commentable_id");

-- CreateIndex
CREATE UNIQUE INDEX "post_commentable_id_key" ON "post"("commentable_id");

-- CreateIndex
CREATE UNIQUE INDEX "product_commentable_id_key" ON "product"("commentable_id");
