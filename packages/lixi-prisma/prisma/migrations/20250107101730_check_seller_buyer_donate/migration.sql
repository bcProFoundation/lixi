-- AlterTable
ALTER TABLE "escrow_order" ADD COLUMN     "buyer_donate" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "seller_donate" BOOLEAN NOT NULL DEFAULT false;
