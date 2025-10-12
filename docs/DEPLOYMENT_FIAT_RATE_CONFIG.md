# Backend Fiat Rate Fallback - Configuration Guide

**Date**: October 12, 2025  
**Status**: ✅ **READY FOR DEPLOYMENT**

---

## 🎯 Quick Start

### 1. Environment Configuration

Set these environment variables in your deployment:

```bash
# Primary endpoint (tried first)
BITCORE_URL=https://aws-dev.abcpay.cash/bws/api

# Fallback endpoint(s) - comma-separated
BITCORE_URL_FALLBACK=https://aws.abcpay.cash/bws/api
```

---

## 📋 Deployment Configurations

### Local Development

**File**: `.env`

```bash
DEPLOY_ENVIRONMENT=development
BITCORE_URL=https://aws-dev.abcpay.cash/bws/api
BITCORE_URL_FALLBACK=https://aws.abcpay.cash/bws/api
```

**Fallback order**: dev → prod

---

### Production

**File**: `.env.production` or deployment config

```bash
DEPLOY_ENVIRONMENT=production
BITCORE_URL=https://aws.abcpay.cash/bws/api
BITCORE_URL_FALLBACK=https://aws-dev.abcpay.cash/bws/api
```

**Fallback order**: prod → dev

---

### Multiple Fallbacks

You can specify multiple fallback URLs:

```bash
BITCORE_URL=https://aws.abcpay.cash/bws/api
BITCORE_URL_FALLBACK=https://aws-dev.abcpay.cash/bws/api,https://backup.abcpay.cash/bws/api,https://emergency.abcpay.cash/bws/api
```

**Fallback order**: prod → dev → backup → emergency

---

## 🔄 How It Works

1. **Primary Attempt**: Tries `BITCORE_URL` first
2. **Fallback**: If primary fails, tries each URL in `BITCORE_URL_FALLBACK` in order
3. **Logging**: All attempts logged for monitoring
4. **Return**: Returns empty array if all endpoints fail

---

## 📊 Example Logs

### Successful Primary Request
```
[Fiat Rate] Attempting to fetch from: https://aws-dev.abcpay.cash/bws/api/v3/fiatrates/
[Fiat Rate] Successfully fetched from: https://aws-dev.abcpay.cash/bws/api/v3/fiatrates/
[Fiat Rate] Successfully fetched rates for 20 currencies
```

### Fallback Triggered
```
[Fiat Rate] Attempting to fetch from: https://aws-dev.abcpay.cash/bws/api/v3/fiatrates/
[Fiat Rate] Failed to fetch from https://aws-dev.abcpay.cash/bws/api/v3/fiatrates/: Network timeout
[Fiat Rate] Attempting to fetch from: https://aws.abcpay.cash/bws/api/v3/fiatrates/
[Fiat Rate] Successfully fetched from: https://aws.abcpay.cash/bws/api/v3/fiatrates/
[Fiat Rate] Successfully fetched rates for 20 currencies
```

### All Endpoints Failed
```
[Fiat Rate] Attempting to fetch from: https://aws-dev.abcpay.cash/bws/api/v3/fiatrates/
[Fiat Rate] Failed to fetch from https://aws-dev.abcpay.cash/bws/api/v3/fiatrates/: Network error
[Fiat Rate] Attempting to fetch from: https://aws.abcpay.cash/bws/api/v3/fiatrates/
[Fiat Rate] Failed to fetch from https://aws.abcpay.cash/bws/api/v3/fiatrates/: Network error
[Fiat Rate] All endpoints failed for /v3/fiatrates/. Last error: Network error
[Fiat Rate] getAllFiatRate error: Network error
```

---

## 🧪 Testing

### Test GraphQL Query

```bash
curl -s http://localhost:4800/graphql \
  -H "Content-Type: application/json" \
  -d '{"query":"{ getAllFiatRate { currency fiatRates { coin ts rate } } }"}'
```

### Expected Response

```json
{
  "data": {
    "getAllFiatRate": [
      {
        "currency": "BTC",
        "fiatRates": [
          { "coin": "USD", "ts": 1697123456789, "rate": 0 },
          { "coin": "EUR", "ts": 1697123456789, "rate": 0 }
        ]
      }
    ]
  }
}
```

---

## 🚀 Deployment Steps

### 1. Update Environment Variables

Add to your deployment configuration:

```bash
BITCORE_URL=<primary-endpoint>
BITCORE_URL_FALLBACK=<fallback-endpoints>
```

### 2. Deploy Code

The resolver code is already updated. Just deploy:

```bash
cd packages/app-lixi-api
pnpm run build
# Deploy to your environment
```

### 3. Verify

After deployment, check logs for:

```
[Fiat Rate] Attempting to fetch from: <your-endpoint>
[Fiat Rate] Successfully fetched from: <your-endpoint>
```

### 4. Monitor

Watch for fallback triggers:

```bash
grep "Fiat Rate" logs/app.log | grep "Failed to fetch"
```

---

## ⚠️ Important Notes

1. **No Code Changes Needed**: Just update environment variables for different environments
2. **Backward Compatible**: If `BITCORE_URL_FALLBACK` is not set, only primary URL is used
3. **CORS Solved**: All API calls happen server-side, no CORS issues
4. **Frontend Unchanged**: Frontend continues to call GraphQL endpoint
5. **Comma-Separated**: Multiple fallbacks separated by commas

---

## 📚 Files Updated

### Code Changes
- `packages/app-lixi-api/src/modules/escrow/fiat-currency-rate/fiatCurrencyRate.resolver.ts`

### Configuration Files
- `packages/app-lixi-api/.env` (updated with fallback example)
- `packages/app-lixi-api/.env.example` (updated with fallback docs)
- `packages/app-lixi-api/.env.development.example` (created)
- `packages/app-lixi-api/.env.production.example` (created)

### Documentation
- `docs/BACKEND_FIAT_FALLBACK_RECOMMENDATION.md` (comprehensive guide)
- `docs/DEPLOYMENT_FIAT_RATE_CONFIG.md` (this file)

---

## 🔗 Related Documentation

- [Backend Fiat Fallback Recommendation](./BACKEND_FIAT_FALLBACK_RECOMMENDATION.md) - Detailed technical documentation
- [Architecture: Fiat Rate Flow](./ARCHITECTURE_FIAT_RATE_FLOW.md) - System architecture overview
- [Frontend Fallback Strategy](./FRONTEND_FALLBACK_STRATEGY.md) - Frontend fallback (not implemented due to CORS)

---

## 📞 Support

If you encounter issues:

1. Check logs for error messages
2. Verify environment variables are set correctly
3. Test each endpoint manually with curl
4. Ensure URLs don't have trailing slashes (they're added automatically)

---

**Status**: ✅ Implemented and tested
**Ready for**: Production deployment
