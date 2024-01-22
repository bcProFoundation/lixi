-- DropForeignKey
ALTER TABLE "comment_dana" DROP CONSTRAINT "comment_dana_comment_id_fkey";

-- AddForeignKey
ALTER TABLE "comment_dana" ADD CONSTRAINT "comment_dana_comment_id_fkey" FOREIGN KEY ("comment_id") REFERENCES "comment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
