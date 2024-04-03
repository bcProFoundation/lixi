-- CreateTable
CREATE TABLE "AccountAddress" (
    "id" TEXT NOT NULL,
    "account_id" INTEGER NOT NULL,
    "xpi_address" TEXT NOT NULL DEFAULT '',
    "xpi_address_hash_160" BYTEA NOT NULL DEFAULT '\x',
    "public_key" TEXT NOT NULL DEFAULT '',
    "xec_address" TEXT NOT NULL DEFAULT '',

    CONSTRAINT "AccountAddress_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AccountAddress_account_id_key" ON "AccountAddress"("account_id");

-- AddForeignKey
ALTER TABLE "AccountAddress" ADD CONSTRAINT "AccountAddress_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
