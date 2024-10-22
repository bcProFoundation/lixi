-- AlterTable
ALTER TABLE "escrow_order" ALTER COLUMN "price" DROP DEFAULT,
ALTER COLUMN "price" TYPE VARCHAR USING ("price"::TEXT);
