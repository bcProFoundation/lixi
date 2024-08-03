-- DropIndex
DROP INDEX "wallet_path_address_key";

-- DropIndex
DROP INDEX "wallet_path_hash160_key";

-- AlterTable
ALTER TABLE "wallet_path" ADD COLUMN     "id" SERIAL NOT NULL,
ADD CONSTRAINT "wallet_path_pkey" PRIMARY KEY ("id");
