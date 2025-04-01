/*
  Warnings:

  - A unique constraint covering the columns `[anonymous_username_localecash]` on the table `account` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Setting" ADD COLUMN     "use_public_local_user_name" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "account" ADD COLUMN     "anonymous_username_localecash" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "account_anonymous_username_localecash_key" ON "account"("anonymous_username_localecash");

CREATE OR REPLACE FUNCTION populate_anonymous_username_localecash() RETURNS void AS $$
DECLARE
    acc RECORD;
    year_suffix TEXT;
    random_num TEXT;
    anonymous_id TEXT;
    is_unique BOOLEAN;
BEGIN
    FOR acc IN SELECT id, date_part('year', "created_at") AS creation_year FROM "account" WHERE "anonymous_username_localecash" IS NULL LOOP
        is_unique = FALSE;
        
        WHILE NOT is_unique LOOP
            -- Get last two digits of year
            year_suffix = RIGHT(acc.creation_year::TEXT, 2);
            -- Generate random number between 1000-9999
            random_num = (1000 + floor(random() * 9000))::TEXT;
            -- Create anonymous ID
            anonymous_id = 'LocalUser-' || year_suffix || random_num;
            
            -- Check if it's unique
            PERFORM id FROM "account" WHERE "anonymous_username_localecash" = anonymous_id;
            IF NOT FOUND THEN
                is_unique = TRUE;
                -- Update the account
                UPDATE "account" SET "anonymous_username_localecash" = anonymous_id WHERE id = acc.id;
            END IF;
        END LOOP;
    END LOOP;
END;

$$ LANGUAGE plpgsql;

SELECT populate_anonymous_username_localecash();
