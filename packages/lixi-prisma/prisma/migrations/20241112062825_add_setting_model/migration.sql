-- CreateTable
CREATE TABLE "Setting" (
    "id" TEXT NOT NULL,
    "accountId" INTEGER NOT NULL,
    "lastSeedBackupTime" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Setting_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Setting_accountId_key" ON "Setting"("accountId");

-- AddForeignKey
ALTER TABLE "Setting" ADD CONSTRAINT "Setting_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
