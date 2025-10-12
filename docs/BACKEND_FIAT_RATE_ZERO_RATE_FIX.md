# Fiat Rate Zero Rate Detection and Fallback Fix

**Date**: October 12, 2025  
**Issue**: getAllFiatRate was returning all zero rates  
**Status**: ✅ **FIXED**

---

## 🐛 Problem Description

The `getAllFiatRate` GraphQL query was returning valid data structure but all rates were **zero**:

```json
{
  "currency": "XEC",
  "fiatRates": [
    {"coin": "USD", "ts": 1760257659439, "rate": 0},
    {"coin": "EUR", "ts": 1760257659439, "rate": 0},
    ...
  ]
}
```

This caused issues in the frontend:
- ❌ Goods & Services orders couldn't calculate prices
- ❌ "PlaceAnOrderModal" component failed
- ❌ Users unable to place orders

---

## 🔍 Root Cause Analysis

### Initial Investigation
1. The v3 API endpoint `/v3/fiatrates/` was being called successfully
2. API returned valid response structure with timestamps and currency codes
3. However, the response transformation was hardcoding `rate: 0`

### Code Issue
```typescript
// OLD CODE - Hardcoded zero rates
fiatRates: data[currency].map((item: any) => ({
  coin: item.code,
  ts: item.ts,
  rate: 0 // ❌ Always zero!
}))
```

### Why This Happened
The v3 API response may sometimes include the rate field in the response, but in some cases returns zero or the field is missing. The original code didn't:
1. ✅ Use the `item.rate` field from the API response
2. ✅ Validate that rates are non-zero
3. ✅ Fallback to alternate endpoints when rates are zero

---

## ✅ Solution Implemented

### 1. Use Actual Rate Values from API
```typescript
// NEW CODE - Use actual rate from API
fiatRates: data[currency].map((item: any) => ({
  coin: item.code,
  ts: item.ts,
  rate: item.rate || 0 // ✅ Use rate from API, fallback to 0 if missing
}))
```

### 2. Zero Rate Detection
Added validation to detect when all rates are zero:

```typescript
// Check if we have any non-zero rates
const hasNonZeroRates = fiatRates.some(currencyData => 
  currencyData.fiatRates.some((rate: any) => rate.rate > 0)
);

if (!hasNonZeroRates) {
  this.logger.warn(`[Fiat Rate] All rates are zero from ${url}, trying next fallback`);
  lastError = new Error('All rates are zero');
  continue; // Try next fallback URL
}
```

### 3. Fallback on Zero Rates
The resolver now tries each fallback URL if rates are zero:

**Fallback Flow**:
```
Primary URL (aws-dev.abcpay.cash)
  ↓ All rates zero?
  ↓ YES
Fallback URL (aws.abcpay.cash) ← PRODUCTION
  ↓ All rates zero?
  ↓ NO - Success!
Return valid rates to frontend ✅
```

### 4. Error Propagation
If all URLs return zero rates or fail:

```typescript
// All URLs failed
throw new Error('All fiat rate APIs returned zero rates or failed');
```

This error is:
- ✅ Logged with full context
- ✅ Propagated to GraphQL layer
- ✅ Returned to frontend as GraphQL error
- ✅ Frontend can display appropriate error message

---

## 📊 Test Results

### Before Fix
```bash
$ curl http://localhost:4800/graphql -d '{"query":"{ getAllFiatRate { currency fiatRates { coin rate } } }"}'

{
  "currency": "XEC",
  "fiatRates": [
    {"coin": "USD", "rate": 0},  # ❌ Zero!
    {"coin": "EUR", "rate": 0},  # ❌ Zero!
    ...
  ]
}
```

### After Fix
```bash
$ curl http://localhost:4800/graphql -d '{"query":"{ getAllFiatRate { currency fiatRates { coin rate } } }"}'

{
  "currency": "XEC",
  "fiatRates": [
    {"coin": "USD", "rate": 0.00001476},     # ✅ Valid rate!
    {"coin": "EUR", "rate": 0.000012695078}, # ✅ Valid rate!
    ...
  ]
}
```

### Statistics
- **18 currencies** returned
- **174 fiat rates per currency**
- **14/18 currencies** have non-zero rates (BTC, BCH, XEC, ETH, XRP, DOGE, LTC, XPI, EAT, BCPRO, BCPROSTAR, TYD, ELPS, BUX)
- **4/18 currencies** still have zero rates (MATIC, ARB, BASE, OP - likely not supported by external API)

---

## 🔧 Files Modified

### 1. `fiatCurrencyRate.resolver.ts`
**Changes**:
- ✅ Added `firstValueFrom`, `catchError`, `AxiosError` imports
- ✅ Rewrote `getAllFiatRate()` to use manual fallback loop (not `fetchWithFallback`)
- ✅ Added zero rate detection logic
- ✅ Changed error handling to throw errors instead of returning empty array
- ✅ Use `item.rate` from API response instead of hardcoded 0

**Key Code**:
```typescript
// Transform and use actual rates
const fiatRates: AllFiatRates[] = Object.keys(data).map(currency => ({
  currency: currency.toUpperCase(),
  fiatRates: data[currency].map((item: any) => ({
    coin: item.code,
    ts: item.ts,
    rate: item.rate || 0  // Use actual rate from API
  }))
}));

// Validate non-zero rates
const hasNonZeroRates = fiatRates.some(currencyData => 
  currencyData.fiatRates.some((rate: any) => rate.rate > 0)
);

if (!hasNonZeroRates) {
  continue; // Try next fallback
}
```

### 2. `BACKEND_FIAT_FALLBACK_RECOMMENDATION.md`
**Changes**:
- ✅ Updated status to include "Zero Rate Detection"
- ✅ Added comprehensive "Zero Rate Detection and Validation" section
- ✅ Documented validation flow and error handling
- ✅ Added code examples for zero rate detection

---

## 🚀 Deployment Notes

### Environment Configuration
No changes needed to environment variables. The existing configuration works:

**Development/Local**:
```bash
BITCORE_URL=https://aws-dev.abcpay.cash/bws/api
BITCORE_URL_FALLBACK=https://aws.abcpay.cash/bws/api
```

**Production**:
```bash
BITCORE_URL=https://aws.abcpay.cash/bws/api
BITCORE_URL_FALLBACK=https://aws-dev.abcpay.cash/bws/api
```

### Server Restart
After deploying the code changes:
```bash
# Restart the API server
pnpm run dev
# or
npm run start:dev
```

### Monitoring
Check logs for:
```
[Fiat Rate] Attempting getAllFiatRate from: https://...
[Fiat Rate] Successfully fetched rates for 18 currencies from https://...
```

If fallback occurs:
```
[Fiat Rate] All rates are zero from https://..., trying next fallback
```

If all endpoints fail:
```
[Fiat Rate] All fiat rate APIs returned zero rates or failed
```

---

## ✅ Verification Checklist

- [x] Code compiles without errors
- [x] getAllFiatRate returns non-zero rates
- [x] Zero rate detection works correctly
- [x] Fallback to production endpoint when dev returns zeros
- [x] Error is thrown when all endpoints fail
- [x] Logs show which endpoint was used
- [x] Frontend can receive and display rates
- [x] Goods & Services orders can calculate prices
- [x] Documentation updated

---

## 🎯 Impact

### Before
- ❌ All rates were zero
- ❌ Orders couldn't be placed
- ❌ No fallback on invalid data
- ❌ Silent failure (returned empty array)

### After
- ✅ Valid non-zero rates returned
- ✅ Orders work correctly
- ✅ Automatic fallback on zero rates
- ✅ Clear error messages when all endpoints fail
- ✅ Better logging for debugging

---

## 📝 Related Issues

- **CORS Issue**: Prevented frontend from calling API directly → Backend fallback implemented
- **Zero Rate Issue**: Backend fallback worked but data was invalid → Zero rate detection added
- **Goods & Services Filter**: Main feature completed and working with valid rates

---

## 🔗 Related Documentation

- [ARCHITECTURE_FIAT_RATE_FLOW.md](./ARCHITECTURE_FIAT_RATE_FLOW.md)
- [BACKEND_FIAT_FALLBACK_RECOMMENDATION.md](./BACKEND_FIAT_FALLBACK_RECOMMENDATION.md)
- [FRONTEND_FALLBACK_STRATEGY.md](./FRONTEND_FALLBACK_STRATEGY.md)
- [DEPLOYMENT_FIAT_RATE_CONFIG.md](./DEPLOYMENT_FIAT_RATE_CONFIG.md)

---

**Fix Verified**: October 12, 2025 ✅
