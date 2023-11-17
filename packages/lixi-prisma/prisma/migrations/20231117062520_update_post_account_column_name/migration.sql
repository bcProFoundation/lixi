/*
  Warnings:

  - You are about to drop the column `post_account_id` on the `post` table. All the data in the column will be lost.
  - Added the required column `account_id` to the `post` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "post" DROP CONSTRAINT "post_post_account_id_fkey";

-- DropIndex
DROP INDEX "post_post_account_id_idx";

-- AlterTable
ALTER TABLE "post" RENAME "post_account_id" TO "account_id";

-- CreateIndex
CREATE INDEX "post_account_id_idx" ON "post"("account_id");

-- AddForeignKey
ALTER TABLE "post" ADD CONSTRAINT "post_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
