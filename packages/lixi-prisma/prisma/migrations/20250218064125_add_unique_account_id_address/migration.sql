/*
  Warnings:

  - A unique constraint covering the columns `[account_id,address]` on the table `chronik_watch_address` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "chronik_watch_address_account_id_address_key" ON "chronik_watch_address"("account_id", "address");
