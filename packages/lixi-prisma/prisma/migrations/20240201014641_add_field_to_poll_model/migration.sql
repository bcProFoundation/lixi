-- AlterTable
ALTER TABLE "poll" ADD COLUMN     "can_add_option" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "single_select" BOOLEAN NOT NULL DEFAULT true;
