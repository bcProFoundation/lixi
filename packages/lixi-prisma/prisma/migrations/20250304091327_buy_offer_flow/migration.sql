-- AlterTable
ALTER TABLE "escrow_order" ADD COLUMN     "mark_as_paid" BOOLEAN DEFAULT false;

-- AlterTable
ALTER TABLE "offer" ADD COLUMN     "payment_app" TEXT;

-- CreateTable
CREATE TABLE "bank_info" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "bank_name" TEXT,
    "account_name_bank" TEXT,
    "account_number_bank" TEXT,
    "app_name" TEXT,
    "account_name_app" TEXT,
    "account_number_app" TEXT,

    CONSTRAINT "bank_info_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "bank_info_orderId_key" ON "bank_info"("orderId");

-- AddForeignKey
ALTER TABLE "bank_info" ADD CONSTRAINT "bank_info_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "escrow_order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
