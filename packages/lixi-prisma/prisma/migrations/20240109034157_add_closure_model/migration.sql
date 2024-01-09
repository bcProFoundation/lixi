-- AlterTable
ALTER TABLE "comment" ADD COLUMN     "parentId" TEXT;

-- CreateTable
CREATE TABLE "Closure" (
    "ancestor" TEXT NOT NULL,
    "descendant" TEXT NOT NULL,
    "depth" INTEGER NOT NULL,
    "commentId" TEXT NOT NULL,

    CONSTRAINT "Closure_pkey" PRIMARY KEY ("ancestor","descendant")
);

-- CreateIndex
CREATE INDEX "Closure_ancestor_idx" ON "Closure"("ancestor");

-- CreateIndex
CREATE INDEX "Closure_descendant_idx" ON "Closure"("descendant");

-- AddForeignKey
ALTER TABLE "Closure" ADD CONSTRAINT "Closure_commentId_fkey" FOREIGN KEY ("commentId") REFERENCES "comment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
