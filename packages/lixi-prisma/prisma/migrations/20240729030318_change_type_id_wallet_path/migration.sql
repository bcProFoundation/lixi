/*
  Warnings:

  - The primary key for the `wallet_path` table will be changed. If it partially fails, the table could be left without primary key constraint.

*/
-- AlterTable
ALTER TABLE "wallet_path" DROP CONSTRAINT "wallet_path_pkey",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ADD CONSTRAINT "wallet_path_pkey" PRIMARY KEY ("id");
DROP SEQUENCE "wallet_path_id_seq";
