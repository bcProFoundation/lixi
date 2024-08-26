/*
  Warnings:

  - Made the column `escrow_order_id` on table `dispute` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE "dispute" DROP CONSTRAINT "dispute_escrow_order_id_fkey";

-- AlterTable
ALTER TABLE "dispute" ALTER COLUMN "escrow_order_id" SET NOT NULL;

-- AddForeignKey
ALTER TABLE "dispute" ADD CONSTRAINT "dispute_escrow_order_id_fkey" FOREIGN KEY ("escrow_order_id") REFERENCES "escrow_order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
