/*
  Warnings:

  - You are about to drop the column `arbitrator_public_key` on the `escrow_order` table. All the data in the column will be lost.
  - You are about to drop the column `buyer_public_key` on the `escrow_order` table. All the data in the column will be lost.
  - You are about to drop the column `seller_public_key` on the `escrow_order` table. All the data in the column will be lost.
  - Added the required column `arbitrator_account_id` to the `escrow_order` table without a default value. This is not possible if the table is not empty.
  - Added the required column `buyer_account_id` to the `escrow_order` table without a default value. This is not possible if the table is not empty.
  - Added the required column `moderator_account_id` to the `escrow_order` table without a default value. This is not possible if the table is not empty.
  - Added the required column `seller_account_id` to the `escrow_order` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "Role" AS ENUM ('MODERATOR', 'ARBITRATOR', 'USER');

-- AlterTable
ALTER TABLE "account" ADD COLUMN     "role" "Role" NOT NULL DEFAULT 'USER';

-- AlterTable
ALTER TABLE "escrow_order" DROP COLUMN "arbitrator_public_key",
DROP COLUMN "buyer_public_key",
DROP COLUMN "seller_public_key",
ADD COLUMN     "arbitrator_account_id" INTEGER NOT NULL,
ADD COLUMN     "buyer_account_id" INTEGER NOT NULL,
ADD COLUMN     "moderator_account_id" INTEGER NOT NULL,
ADD COLUMN     "seller_account_id" INTEGER NOT NULL;

-- AddForeignKey
ALTER TABLE "escrow_order" ADD CONSTRAINT "escrow_order_seller_account_id_fkey" FOREIGN KEY ("seller_account_id") REFERENCES "account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "escrow_order" ADD CONSTRAINT "escrow_order_buyer_account_id_fkey" FOREIGN KEY ("buyer_account_id") REFERENCES "account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "escrow_order" ADD CONSTRAINT "escrow_order_arbitrator_account_id_fkey" FOREIGN KEY ("arbitrator_account_id") REFERENCES "account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "escrow_order" ADD CONSTRAINT "escrow_order_moderator_account_id_fkey" FOREIGN KEY ("moderator_account_id") REFERENCES "account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
