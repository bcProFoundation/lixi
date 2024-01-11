-- DropForeignKey
ALTER TABLE "bookmark" DROP CONSTRAINT "bookmark_bookmarkable_id_fkey";

-- DropForeignKey
ALTER TABLE "post_dana" DROP CONSTRAINT "post_dana_post_id_fkey";

-- DropForeignKey
ALTER TABLE "post_hashtag" DROP CONSTRAINT "post_hashtag_postId_fkey";

-- DropForeignKey
ALTER TABLE "post_translation" DROP CONSTRAINT "post_translation_post_id_fkey";

-- DropForeignKey
ALTER TABLE "repost" DROP CONSTRAINT "repost_post_id_fkey";

-- DropForeignKey
ALTER TABLE "repost_dana" DROP CONSTRAINT "repost_dana_repost_id_fkey";

-- DropForeignKey
ALTER TABLE "upload" DROP CONSTRAINT "upload_image_uploadable_id_fkey";

-- AddForeignKey
ALTER TABLE "post_dana" ADD CONSTRAINT "post_dana_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "post"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "upload" ADD CONSTRAINT "upload_image_uploadable_id_fkey" FOREIGN KEY ("image_uploadable_id") REFERENCES "image_uploadable"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "post_hashtag" ADD CONSTRAINT "post_hashtag_postId_fkey" FOREIGN KEY ("postId") REFERENCES "post"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "repost" ADD CONSTRAINT "repost_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "post"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "repost_dana" ADD CONSTRAINT "repost_dana_repost_id_fkey" FOREIGN KEY ("repost_id") REFERENCES "repost"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "post_translation" ADD CONSTRAINT "post_translation_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "post"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookmark" ADD CONSTRAINT "bookmark_bookmarkable_id_fkey" FOREIGN KEY ("bookmarkable_id") REFERENCES "bookmarkable"("id") ON DELETE CASCADE ON UPDATE CASCADE;
