-- DropForeignKey
ALTER TABLE "dispute" DROP CONSTRAINT "dispute_escrow_order_id_fkey";

-- AlterTable
ALTER TABLE "dispute" ALTER COLUMN "escrow_order_id" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "dispute" ADD CONSTRAINT "dispute_escrow_order_id_fkey" FOREIGN KEY ("escrow_order_id") REFERENCES "escrow_order"("id") ON DELETE SET NULL ON UPDATE CASCADE;
