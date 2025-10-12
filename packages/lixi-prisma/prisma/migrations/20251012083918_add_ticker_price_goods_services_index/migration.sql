-- CreateIndex
-- Add index on ticker_price_goods_services for efficient filtering of Goods & Services offers by price currency
-- This supports the new tickerPriceGoodsServices filter in OfferFilterInput
-- Related to: BACKEND_CHANGE_REQUEST_GOODS_SERVICES_FILTER.md

CREATE INDEX IF NOT EXISTS "idx_offer_ticker_price_goods_services" 
ON "offer"("ticker_price_goods_services")
WHERE "ticker_price_goods_services" IS NOT NULL;
