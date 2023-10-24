/*
  Warnings:

  - You are about to drop the column `type` on the `bookmark` table. All the data in the column will be lost.
  - Added the required column `bookmarkable_id` to the `bookmark` table without a default value. This is not possible if the table is not empty.
  - Added the required column `taggableId` to the `event` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "bookmark" DROP COLUMN "type",
ADD COLUMN     "bookmarkable_id" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "event" ADD COLUMN     "bookmarkable_id" TEXT,
ADD COLUMN     "taggableId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "poll" ADD COLUMN     "bookmarkable_id" TEXT,
ADD COLUMN     "taggableId" TEXT;

-- AlterTable
ALTER TABLE "post" ADD COLUMN     "bookmarkable_id" TEXT,
ADD COLUMN     "taggableId" TEXT;

-- AlterTable
ALTER TABLE "product" ADD COLUMN     "bookmarkable_id" TEXT,
ADD COLUMN     "commentable_id" TEXT,
ADD COLUMN     "taggableId" TEXT;

-- DropEnum
DROP TYPE "BookmarkType";

-- CreateTable
CREATE TABLE "bookmarkable" (
    "id" TEXT NOT NULL,

    CONSTRAINT "bookmarkable_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "post" ADD CONSTRAINT "post_bookmarkable_id_fkey" FOREIGN KEY ("bookmarkable_id") REFERENCES "bookmarkable"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "post" ADD CONSTRAINT "post_taggableId_fkey" FOREIGN KEY ("taggableId") REFERENCES "taggable"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookmark" ADD CONSTRAINT "bookmark_bookmarkable_id_fkey" FOREIGN KEY ("bookmarkable_id") REFERENCES "bookmarkable"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event" ADD CONSTRAINT "event_bookmarkable_id_fkey" FOREIGN KEY ("bookmarkable_id") REFERENCES "bookmarkable"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event" ADD CONSTRAINT "event_taggableId_fkey" FOREIGN KEY ("taggableId") REFERENCES "taggable"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "poll" ADD CONSTRAINT "poll_bookmarkable_id_fkey" FOREIGN KEY ("bookmarkable_id") REFERENCES "bookmarkable"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "poll" ADD CONSTRAINT "poll_taggableId_fkey" FOREIGN KEY ("taggableId") REFERENCES "taggable"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product" ADD CONSTRAINT "product_commentable_id_fkey" FOREIGN KEY ("commentable_id") REFERENCES "commentable"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product" ADD CONSTRAINT "product_bookmarkable_id_fkey" FOREIGN KEY ("bookmarkable_id") REFERENCES "bookmarkable"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product" ADD CONSTRAINT "product_taggableId_fkey" FOREIGN KEY ("taggableId") REFERENCES "taggable"("id") ON DELETE SET NULL ON UPDATE CASCADE;
