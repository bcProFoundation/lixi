-- AlterTable
ALTER TABLE "offer" ADD COLUMN     "_id" TEXT;

-- CreateTable
CREATE TABLE "world_cities" (
    "city" VARCHAR(120),
    "city_ascii" VARCHAR(120),
    "city_alt" VARCHAR(1000),
    "lat" DOUBLE PRECISION DEFAULT 0.0,
    "lng" DOUBLE PRECISION DEFAULT 0.0,
    "country" VARCHAR(120),
    "iso2" CHAR(2),
    "iso3" CHAR(3),
    "admin_name" VARCHAR(120),
    "admin_name_ascii" VARCHAR(120),
    "admin_code" VARCHAR(6),
    "admin_type" VARCHAR(27),
    "capital" VARCHAR(7),
    "density" DOUBLE PRECISION DEFAULT 0.0,
    "population" TEXT,
    "population_proper" TEXT,
    "ranking" INTEGER,
    "timezone" VARCHAR(120),
    "same_name" VARCHAR(5),
    "id" VARCHAR(10) NOT NULL,

    CONSTRAINT "world_cities_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "world_cities_iso2_idx" ON "world_cities"("iso2");

-- CreateIndex
CREATE INDEX "world_cities_iso2_admin_name_ascii_idx" ON "world_cities"("iso2", "admin_name_ascii");

-- AddForeignKey
ALTER TABLE "offer" ADD CONSTRAINT "offer__id_fkey" FOREIGN KEY ("_id") REFERENCES "world_cities"("id") ON DELETE SET NULL ON UPDATE CASCADE;
