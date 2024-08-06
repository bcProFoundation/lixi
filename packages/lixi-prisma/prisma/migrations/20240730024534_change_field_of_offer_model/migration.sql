/*
  Warnings:

  - You are about to drop the column `amount` on the `offer` table. All the data in the column will be lost.
  - You are about to drop the column `description` on the `offer` table. All the data in the column will be lost.
  - You are about to drop the column `title` on the `offer` table. All the data in the column will be lost.
  - The primary key for the `payment_method` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The `id` column on the `payment_method` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - Changed the type of `payment_method_id` on the `escrow_order` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Added the required column `message` to the `offer` table without a default value. This is not possible if the table is not empty.
  - Made the column `order_limit_min` on table `offer` required. This step will fail if there are existing NULL values in that column.
  - Made the column `order_limit_max` on table `offer` required. This step will fail if there are existing NULL values in that column.
  - Changed the type of `payment_method_id` on the `offer_payment_method` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- DropForeignKey
ALTER TABLE "escrow_order" DROP CONSTRAINT "escrow_order_payment_method_id_fkey";

-- DropForeignKey
ALTER TABLE "offer_payment_method" DROP CONSTRAINT "offer_payment_method_payment_method_id_fkey";

-- AlterTable
ALTER TABLE "escrow_order" DROP COLUMN "payment_method_id",
ADD COLUMN     "payment_method_id" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "offer" DROP COLUMN "amount",
DROP COLUMN "description",
DROP COLUMN "title",
ADD COLUMN     "message" TEXT NOT NULL,
ALTER COLUMN "price" DROP DEFAULT,
ALTER COLUMN "price" SET DATA TYPE TEXT,
ALTER COLUMN "coin" SET DEFAULT 'XEC',
ALTER COLUMN "order_limit_min" SET NOT NULL,
ALTER COLUMN "order_limit_max" SET NOT NULL,
ALTER COLUMN "type" SET DEFAULT 'SELL';

-- AlterTable
ALTER TABLE "offer_payment_method" DROP COLUMN "payment_method_id",
ADD COLUMN     "payment_method_id" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "payment_method" DROP CONSTRAINT "payment_method_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" SERIAL NOT NULL,
ADD CONSTRAINT "payment_method_pkey" PRIMARY KEY ("id");

-- AddForeignKey
ALTER TABLE "escrow_order" ADD CONSTRAINT "escrow_order_payment_method_id_fkey" FOREIGN KEY ("payment_method_id") REFERENCES "payment_method"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "offer_payment_method" ADD CONSTRAINT "offer_payment_method_payment_method_id_fkey" FOREIGN KEY ("payment_method_id") REFERENCES "payment_method"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
