/*
  Warnings:

  - Added the required column `margin_percentage` to the `offer` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "offer" DROP COLUMN IF EXISTS "coin_payment";
ALTER TABLE "offer" DROP COLUMN IF EXISTS "local_currency";
ALTER TABLE "offer" DROP COLUMN IF EXISTS "margin_percentage";

-- Then, add the columns with the desired properties
ALTER TABLE "offer" 
ADD COLUMN "coin_payment" TEXT,
ADD COLUMN "local_currency" TEXT,
ADD COLUMN "margin_percentage" DOUBLE PRECISION NOT NULL DEFAULT 0.0;