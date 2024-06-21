/*
  Warnings:

  - You are about to drop the `Dispute` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `EscrowOrder` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Offer` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `OfferPaymentMethod` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `PaymentMethod` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "Dispute" DROP CONSTRAINT "Dispute_escrow_order_id_fkey";

-- DropForeignKey
ALTER TABLE "EscrowOrder" DROP CONSTRAINT "EscrowOrder_offer_id_fkey";

-- DropForeignKey
ALTER TABLE "EscrowOrder" DROP CONSTRAINT "EscrowOrder_payment_method_id_fkey";

-- DropForeignKey
ALTER TABLE "OfferPaymentMethod" DROP CONSTRAINT "OfferPaymentMethod_offer_id_fkey";

-- DropForeignKey
ALTER TABLE "OfferPaymentMethod" DROP CONSTRAINT "OfferPaymentMethod_payment_method_id_fkey";

-- DropTable
DROP TABLE "Dispute";

-- DropTable
DROP TABLE "EscrowOrder";

-- DropTable
DROP TABLE "Offer";

-- DropTable
DROP TABLE "OfferPaymentMethod";

-- DropTable
DROP TABLE "PaymentMethod";

-- CreateTable
CREATE TABLE "escrow_order" (
    "id" TEXT NOT NULL,
    "seller_public_key" TEXT NOT NULL,
    "buyer_public_key" TEXT NOT NULL,
    "arbitrator_public_key" TEXT NOT NULL,
    "escrow_address" TEXT,
    "payment_method_id" TEXT NOT NULL,
    "message" TEXT,
    "price" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "amount" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "offer_id" TEXT NOT NULL,
    "status" "EscrowOrderStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "escrow_order_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dispute" (
    "id" TEXT NOT NULL,
    "escrow_order_id" TEXT NOT NULL,
    "created_by" TEXT NOT NULL,
    "reason" TEXT,
    "status" "DisputeStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "dispute_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "offer" (
    "id" TEXT NOT NULL,
    "public_key" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "price" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "amount" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "coin" "Coin" NOT NULL,
    "order_limit_min" DOUBLE PRECISION DEFAULT 0.0,
    "order_limit_max" DOUBLE PRECISION DEFAULT 0.0,
    "type" "OfferType" NOT NULL,
    "status" "OfferStatus" NOT NULL DEFAULT 'ACTIVE',
    "location" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "offer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "offer_payment_method" (
    "id" TEXT NOT NULL,
    "offer_id" TEXT NOT NULL,
    "payment_method_id" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "offer_payment_method_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_method" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "message" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payment_method_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "dispute_escrow_order_id_key" ON "dispute"("escrow_order_id");

-- AddForeignKey
ALTER TABLE "escrow_order" ADD CONSTRAINT "escrow_order_payment_method_id_fkey" FOREIGN KEY ("payment_method_id") REFERENCES "payment_method"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "escrow_order" ADD CONSTRAINT "escrow_order_offer_id_fkey" FOREIGN KEY ("offer_id") REFERENCES "offer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dispute" ADD CONSTRAINT "dispute_escrow_order_id_fkey" FOREIGN KEY ("escrow_order_id") REFERENCES "escrow_order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "offer_payment_method" ADD CONSTRAINT "offer_payment_method_offer_id_fkey" FOREIGN KEY ("offer_id") REFERENCES "offer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "offer_payment_method" ADD CONSTRAINT "offer_payment_method_payment_method_id_fkey" FOREIGN KEY ("payment_method_id") REFERENCES "payment_method"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
