-- CreateEnum
CREATE TYPE "PinType" AS ENUM ('POST', 'COMMENT');

-- AlterTable
ALTER TABLE "event" ADD COLUMN     "pinable_id" TEXT;

-- AlterTable
ALTER TABLE "poll" ADD COLUMN     "pinable_id" TEXT;

-- AlterTable
ALTER TABLE "post" ADD COLUMN     "pinable_id" TEXT;

-- AlterTable
ALTER TABLE "product" ADD COLUMN     "pinable_id" TEXT;

-- CreateTable
CREATE TABLE "pinable" (
    "id" TEXT NOT NULL,
    "type" "PinType" NOT NULL,

    CONSTRAINT "pinable_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pin" (
    "id" TEXT NOT NULL,
    "pinable_id" TEXT NOT NULL,
    "pageId" TEXT,
    "accountId" INTEGER,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pin_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "pin_pageId_key" ON "pin"("pageId");

-- CreateIndex
CREATE UNIQUE INDEX "pin_accountId_key" ON "pin"("accountId");

-- AddForeignKey
ALTER TABLE "post" ADD CONSTRAINT "post_pinable_id_fkey" FOREIGN KEY ("pinable_id") REFERENCES "pinable"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event" ADD CONSTRAINT "event_pinable_id_fkey" FOREIGN KEY ("pinable_id") REFERENCES "pinable"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "poll" ADD CONSTRAINT "poll_pinable_id_fkey" FOREIGN KEY ("pinable_id") REFERENCES "pinable"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product" ADD CONSTRAINT "product_pinable_id_fkey" FOREIGN KEY ("pinable_id") REFERENCES "pinable"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pin" ADD CONSTRAINT "pin_pinable_id_fkey" FOREIGN KEY ("pinable_id") REFERENCES "pinable"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pin" ADD CONSTRAINT "pin_pageId_fkey" FOREIGN KEY ("pageId") REFERENCES "page"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pin" ADD CONSTRAINT "pin_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "account"("id") ON DELETE SET NULL ON UPDATE CASCADE;
