-- CreateEnum
CREATE TYPE "AddressType" AS ENUM ('P2PKH', 'P2SH');

-- CreateEnum
CREATE TYPE "Coin" AS ENUM ('XPI', 'XEC');

-- CreateTable
CREATE TABLE "wallet_path" (
    "path" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "hash160" TEXT NOT NULL,
    "type" "AddressType" NOT NULL,
    "public_key" TEXT NOT NULL,
    "account_id" INTEGER NOT NULL,
    "network" "Coin" NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "wallet_path_address_key" ON "wallet_path"("address");

-- CreateIndex
CREATE UNIQUE INDEX "wallet_path_hash160_key" ON "wallet_path"("hash160");

-- AddForeignKey
ALTER TABLE "wallet_path" ADD CONSTRAINT "wallet_path_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "account"("id") ON DELETE CASCADE ON UPDATE CASCADE;
