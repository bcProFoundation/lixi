# Goods & Services Payment Flow Documentation

## Overview

The Goods & Services (G&S) marketplace supports two distinct payment flows depending on the payment method selected:

1. **External Payment Flow** - Seller escrows collateral
2. **Direct Payment Flow** - Buyer deposits XEC directly

## Payment Flow Scenarios

### 1. External Payment Flow (Seller Escrows Collateral)

Used when buyer pays outside the blockchain for goods/services:

#### Scenario A: Legacy G&S Offers (paymentMethodId = 5)
- **Context**: Old G&S offers created before `offerCategory` field existed
- **Payment Method**: Legacy G&S (paymentMethodId = 5)
- **Flow**:
  1. Seller deposits XEC as collateral in escrow
  2. Buyer receives goods/services via external means (bank transfer, cash, etc.)
  3. Buyer confirms receipt via BUYER_CONFIRM_RECEIPT action
  4. Seller's collateral is released back to seller (successful completion)
- **UI Indicators**: "Seller Collateral Escrowed", "Confirm Receipt" button
- **Buyer Action**: BUYER_CONFIRM_RECEIPT

#### Scenario B: G&S Category + Bank Transfer (paymentMethodId = 2)
- **Context**: New G&S offers with bank transfer as payment method
- **Payment Method**: Bank Transfer (paymentMethodId = 2)
- **Flow**:
  1. Seller deposits XEC as collateral in escrow
  2. Buyer transfers money via bank to seller
  3. Buyer confirms receipt via BUYER_CONFIRM_RECEIPT action
  4. Seller's collateral is released back to seller
- **UI Indicators**: "Seller Collateral Escrowed", "Confirm Receipt" button, bank details shown
- **Buyer Action**: BUYER_CONFIRM_RECEIPT

#### Scenario C: G&S Category + Payment App (paymentMethodId = 3)
- **Context**: New G&S offers with payment app as payment method
- **Payment Method**: Payment App (paymentMethodId = 3, e.g., PayPal, Venmo)
- **Flow**:
  1. Seller deposits XEC as collateral in escrow
  2. Buyer transfers money via payment app to seller
  3. Buyer confirms receipt via BUYER_CONFIRM_RECEIPT action
  4. Seller's collateral is released back to seller
- **UI Indicators**: "Seller Collateral Escrowed", "Confirm Receipt" button, app name shown
- **Buyer Action**: BUYER_CONFIRM_RECEIPT

#### Scenario D: G&S Category + Crypto (Non-XEC) (paymentMethodId = 4, coinPayment != 'XEC')
- **Context**: New G&S offers with alternative cryptocurrency payment
- **Payment Method**: Crypto (paymentMethodId = 4, e.g., BTC, ETH, BCH)
- **Flow**:
  1. Seller deposits XEC as collateral in escrow
  2. Buyer transfers cryptocurrency to seller's wallet
  3. Buyer confirms receipt via BUYER_CONFIRM_RECEIPT action
  4. Seller's collateral is released back to seller
- **UI Indicators**: "Seller Collateral Escrowed", "Confirm Receipt" button, crypto symbol shown
- **Buyer Action**: BUYER_CONFIRM_RECEIPT

### 2. Direct Payment Flow (Buyer Deposits XEC)

Used when buyer pays directly with XEC for goods/services:

#### Scenario E: G&S Category + Crypto XEC (paymentMethodId = 4, coinPayment = 'XEC')
- **Context**: New G&S offers with XEC as direct payment method
- **Payment Method**: Crypto XEC (paymentMethodId = 4, coinPayment = 'XEC')
- **Flow**:
  1. Buyer deposits XEC directly into escrow (standard buyer deposit)
  2. Seller receives goods/services from buyer (or delivers goods/services)
  3. Seller releases XEC to buyer (standard release flow) OR buyer returns XEC (dispute)
  4. No collateral mechanism - buyer's XEC is in escrow
- **UI Indicators**: Standard order details (NO "Seller Collateral Escrowed" message)
- **Buyer Action**: Standard release/return flows (NOT BUYER_CONFIRM_RECEIPT)
- **Key Difference**: This uses the buyer deposit mechanism, NOT seller collateral mechanism

## Payment Flow Decision Tree

```
Is it a G&S Related Offer?
│
├─ NO → Standard XEC Trading (direct buyer deposit)
│        Flow: Standard escrow (buyer deposits, seller releases)
│        Actions: RELEASE, RETURN, CANCEL
│
└─ YES → Check Payment Method
         │
         ├─ paymentMethodId = 5 (Legacy G&S)
         │  └─ EXTERNAL PAYMENT
         │     Flow: Seller collateral, buyer confirms receipt
         │     Action: BUYER_CONFIRM_RECEIPT
         │
         ├─ paymentMethodId = 2 (Bank Transfer)
         │  └─ EXTERNAL PAYMENT
         │     Flow: Seller collateral, buyer confirms receipt
         │     Action: BUYER_CONFIRM_RECEIPT
         │
         ├─ paymentMethodId = 3 (Payment App)
         │  └─ EXTERNAL PAYMENT
         │     Flow: Seller collateral, buyer confirms receipt
         │     Action: BUYER_CONFIRM_RECEIPT
         │
         ├─ paymentMethodId = 4 (Crypto)
         │  │
         │  ├─ coinPayment = 'XEC' → DIRECT PAYMENT
         │  │  └─ Flow: Buyer deposit, standard release/return
         │  │     Actions: RELEASE, RETURN, CANCEL (NOT BUYER_CONFIRM_RECEIPT)
         │  │
         │  └─ coinPayment != 'XEC' → EXTERNAL PAYMENT
         │     └─ Flow: Seller collateral, buyer confirms receipt
         │        Action: BUYER_CONFIRM_RECEIPT
```

## Implementation Details

### Frontend Logic

**PlaceAnOrderModal.tsx** and **order-detail/page.tsx**:
```typescript
const isExternalPayment = useMemo(() => {
  const hasGoodsServicesCategory = offerCategory === 'GOODS_SERVICES';
  const paymentMethodId = paymentMethod?.id;
  const coinPayment = (offer?.coinPayment || '').toUpperCase();

  // Case 1: Legacy G&S (paymentMethodId = 5)
  if (paymentMethodId === PAYMENT_METHOD.GOODS_SERVICES) return true;

  // Case 2: Not G&S category
  if (!hasGoodsServicesCategory) return false;

  // Case 3: G&S + Crypto XEC = direct payment
  if (paymentMethodId === PAYMENT_METHOD.CRYPTO && coinPayment === 'XEC') return false;

  // Case 4: All other G&S = external payment
  return true;
}, [offer, paymentMethod]);
```

### Backend Validation

**escrow-order.resolver.ts** (BUYER_CONFIRM_RECEIPT action):
```typescript
// BUYER_CONFIRM_RECEIPT is only valid for external payment scenarios
// NOT valid for direct XEC payment (G&S + Crypto XEC)

const isLegacyGoodsServices = paymentMethodId === PAYMENT_METHOD.GOODS_SERVICES;
const hasGoodsServicesCategory = offer?.offerCategory === 'GOODS_SERVICES';
const coinPayment = (offer?.coinPayment || '').toUpperCase();

// Reject direct XEC payment
if (
  hasGoodsServicesCategory &&
  paymentMethodId === PAYMENT_METHOD.CRYPTO &&
  coinPayment === 'XEC'
) {
  throw new Error(
    'BUYER_CONFIRM_RECEIPT cannot be used for direct XEC payment orders. Use standard release flow instead.'
  );
}
```

## UI Behavior

### External Payment Orders
- **Buy Offer Pending State**:
  - Show "Seller Collateral Escrowed" badge
  - Show "Pay the seller externally for the goods/services" message
  - Display payment details (bank account, payment app, crypto address)
  - Show "Confirm Receipt" button for buyer

### Direct XEC Payment Orders
- **Buy Offer Pending State**:
  - Show standard order details (NO external payment messaging)
  - No collateral badge
  - No external payment instructions
  - Buyer waits for seller to release XEC (standard flow)

## Error Handling

### Backend Errors
1. **BUYER_CONFIRM_RECEIPT on non-G&S order**: "BUYER_CONFIRM_RECEIPT can only be used for Goods & Services marketplace orders"
2. **BUYER_CONFIRM_RECEIPT on direct XEC payment**: "BUYER_CONFIRM_RECEIPT cannot be used for direct XEC payment orders. Use standard release flow instead."
3. **Non-buyer calling BUYER_CONFIRM_RECEIPT**: "Only the buyer can confirm receipt of goods/services"
4. **Wrong order status**: "Escrow order is not in escrow status"

## Migration Notes

### Legacy G&S Offers (paymentMethodId = 5)
- These offers do NOT have an `offerCategory` field set
- They are identified by `paymentMethodId === PAYMENT_METHOD.GOODS_SERVICES` (5)
- They are treated as external payment for backward compatibility
- New offers should use `offerCategory = 'GOODS_SERVICES'` with appropriate payment methods

### Future Deprecation
Consider eventually deprecating the legacy G&S payment method (5) and migrating users to the new category-based system:
- Use `offerCategory = 'GOODS_SERVICES'`
- Select appropriate payment method (Bank, Payment App, or Crypto)

## Summary Table

| Offer Type | paymentMethodId | coinPayment | offerCategory | Flow Type | Buyer Action |
|-----------|-----------------|-------------|---------------|-----------|--------------|
| Legacy G&S | 5 | - | (none) | External | BUYER_CONFIRM_RECEIPT |
| G&S + Bank | 2 | - | GOODS_SERVICES | External | BUYER_CONFIRM_RECEIPT |
| G&S + App | 3 | - | GOODS_SERVICES | External | BUYER_CONFIRM_RECEIPT |
| G&S + Crypto (non-XEC) | 4 | BTC/ETH/etc | GOODS_SERVICES | External | BUYER_CONFIRM_RECEIPT |
| **G&S + Crypto (XEC)** | **4** | **XEC** | **GOODS_SERVICES** | **Direct** | **Standard release/return** |
| Standard XEC Trading | 0 | - | (XEC_TRADING) | Direct | Standard release/return |
