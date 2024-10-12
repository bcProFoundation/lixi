-- CreateTable
CREATE TABLE "coin_list" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(50) NOT NULL,
    "alias" TEXT NOT NULL,
    "is_support" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "coin_list_pkey" PRIMARY KEY ("id")
);
