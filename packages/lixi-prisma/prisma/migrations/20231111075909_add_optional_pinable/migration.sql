-- DropForeignKey
ALTER TABLE "pin" DROP CONSTRAINT "pin_pinable_id_fkey";

-- AlterTable
ALTER TABLE "pin" ALTER COLUMN "pinable_id" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "pin" ADD CONSTRAINT "pin_pinable_id_fkey" FOREIGN KEY ("pinable_id") REFERENCES "pinable"("id") ON DELETE SET NULL ON UPDATE CASCADE;
