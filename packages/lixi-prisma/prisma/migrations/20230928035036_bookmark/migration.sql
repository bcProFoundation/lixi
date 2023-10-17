-- CreateEnum
CREATE TYPE "BookmarkType" AS ENUM ('POST', 'COMMENT');

-- CreateTable
CREATE TABLE "bookmark" (
    "id" TEXT NOT NULL,
    "account_id" INTEGER NOT NULL,
    "bookmark_id" TEXT NOT NULL,
    "type" "BookmarkType",
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bookmark_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "bookmark" ADD CONSTRAINT "bookmark_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
