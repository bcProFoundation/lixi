-- CreateTable
CREATE TABLE "offer_key_active_mapping" (
    "id" TEXT NOT NULL,
    "offer_id" TEXT NOT NULL,
    "key_mappings" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "offer_key_active_mapping_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "offer_key_active_mapping_offer_id_key" ON "offer_key_active_mapping"("offer_id");
