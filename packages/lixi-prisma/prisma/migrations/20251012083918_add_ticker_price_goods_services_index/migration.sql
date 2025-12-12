-- CreateIndex
-- Add index on ticker_price_goods_services for efficient filtering of Goods & Services offers by price currency
-- This supports the new tickerPriceGoodsServices filter in OfferFilterInput
-- Related to: BACKEND_CHANGE_REQUEST_GOODS_SERVICES_FILTER.md
--
-- WARNING: CONCURRENTLY indexes may fail during creation. If this migration fails:
-- 1. Check PostgreSQL logs for the specific error
-- 2. If index creation failed, manually drop any partially created indexes:
--    DROP INDEX CONCURRENTLY IF EXISTS "idx_offer_ticker_price_goods_services";
--    DROP INDEX CONCURRENTLY IF EXISTS "idx_offer_ticker_price_goods_services_payment_method_ids";
-- 3. Re-run the migration after resolving conflicts
-- 4. Monitor database performance during index creation as CONCURRENTLY allows reads but may impact writes

CREATE INDEX IF NOT EXISTS "idx_offer_ticker_price_goods_services"
ON "offer"("ticker_price_goods_services")
WHERE "ticker_price_goods_services" IS NOT NULL;

-- Composite index for ticker_price_goods_services and paymentMethodIds
-- Optimizes queries that filter by both currency and payment method
CREATE INDEX IF NOT EXISTS "idx_offer_ticker_price_goods_services_payment_method_ids"
ON "offer"("ticker_price_goods_services", "paymentMethodIds")
WHERE "ticker_price_goods_services" IS NOT NULL AND "paymentMethodIds" IS NOT NULL;
