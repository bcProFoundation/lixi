/*
  Warnings:

  - You are about to drop the `Closure` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "Closure" DROP CONSTRAINT "Closure_commentId_fkey";

-- DropTable
DROP TABLE "Closure";

-- CreateTable
CREATE TABLE "comment_closure" (
    "ancestor" TEXT NOT NULL,
    "descendant" TEXT NOT NULL,
    "depth" INTEGER NOT NULL,
    "commentId" TEXT NOT NULL,

    CONSTRAINT "comment_closure_pkey" PRIMARY KEY ("ancestor","descendant")
);

-- CreateIndex
CREATE INDEX "comment_closure_ancestor_idx" ON "comment_closure"("ancestor");

-- CreateIndex
CREATE INDEX "comment_closure_descendant_idx" ON "comment_closure"("descendant");

-- AddForeignKey
ALTER TABLE "comment_closure" ADD CONSTRAINT "comment_closure_commentId_fkey" FOREIGN KEY ("commentId") REFERENCES "comment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
