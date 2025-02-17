-- CreateTable
CREATE TABLE "chronik_watch_address" (
    "id" TEXT NOT NULL,
    "account_id" INTEGER NOT NULL,
    "address" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "chronik_watch_address_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "chronik_watch_address" ADD CONSTRAINT "chronik_watch_address_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
