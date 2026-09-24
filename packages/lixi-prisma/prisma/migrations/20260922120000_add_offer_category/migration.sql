-- Goods & Services is an offer category. The payment method is how the buyer pays.
-- XEC locked in escrow is collateral, not the payment rail.
ALTER TABLE "offer" ADD COLUMN "offer_category" TEXT;

-- Listings that used payment method 5 were goods offers.
UPDATE "offer" AS o
SET "offer_category" = 'GOODS_SERVICES'
WHERE EXISTS (
  SELECT 1
  FROM "offer_payment_method" AS opm
  WHERE opm."offer_id" = o."post_id"
    AND opm."payment_method_id" = 5
);
