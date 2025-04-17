-- AlterTable
ALTER TABLE "offer" ALTER COLUMN "order_limit_min" DROP NOT NULL,
ALTER COLUMN "order_limit_max" DROP NOT NULL;
