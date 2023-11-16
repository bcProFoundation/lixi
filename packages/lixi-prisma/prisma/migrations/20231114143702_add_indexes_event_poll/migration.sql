/*
  Warnings:

  - You are about to drop the column `post_account_id` on the `event` table. All the data in the column will be lost.
  - Added the required column `account_id` to the `event` table without a default value. This is not possible if the table is not empty.
  - Added the required column `account_id` to the `poll` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "event" DROP CONSTRAINT "event_post_account_id_fkey";

-- AlterTable
ALTER TABLE "event" DROP COLUMN "post_account_id",
ADD COLUMN     "account_id" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "poll" ADD COLUMN     "account_id" INTEGER NOT NULL;

-- CreateIndex
CREATE INDEX "event_commentable_id_idx" ON "event"("commentable_id");

-- CreateIndex
CREATE INDEX "event_account_id_idx" ON "event"("account_id");

-- CreateIndex
CREATE INDEX "event_page_id_idx" ON "event"("page_id");

-- CreateIndex
CREATE INDEX "poll_commentable_id_idx" ON "poll"("commentable_id");

-- CreateIndex
CREATE INDEX "poll_account_id_idx" ON "poll"("account_id");

-- CreateIndex
CREATE INDEX "poll_page_id_idx" ON "poll"("page_id");

-- AddForeignKey
ALTER TABLE "event" ADD CONSTRAINT "event_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "poll" ADD CONSTRAINT "poll_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
