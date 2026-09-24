# Fiat Rate Migration: Bitcore/CryptoCompare → CMC + Open Exchange Rates

## Why

The Bitcore/abcpay fiat-rate backend depends on CryptoCompare, which is no longer
licensed for our commercial use. The new stack prices crypto via CoinMarketCap
and derives long-tail fiat pairs via an USD forex matrix.

## Architecture

```
local-ecash ──GraphQL getAllFiatRate──> lixi API ──> FiatRateService
                                                 ├─> CoinMarketCapProvider (crypto -> fiat, tiered)
                                                 ├─> OpenExchangeRatesProvider (USD -> fiat matrix)
                                                 └─> Redis cache (quote / forex / merged)
```

GraphQL contracts are unchanged:

- `getAllFiatRate: [AllFiatRates!]!`
- `getFiatRate: [FiatRates!]!`
- `rate` means fiat per 1 coin (for example `1 XEC = 0.00001 USD`).

The service returns both shapes the frontend already handles:

- Fiat-grouped: `{ currency: "VND", fiatRates: [{ coin: "XEC", rate }] }`
- Crypto-grouped: `{ currency: "XEC", fiatRates: [{ coin: "VND", rate }] }`

## Phased rollout

### Phase 1 — CMC Basic (free) for XEC-USD

- `CMC_API_KEY` from a free Basic key (commercial use included).
- `CMC_CONVERT_LIMIT=1` (free-tier safe).
- Backend fetches XEC-USD (plus other configured coins in USD) and caches in Redis.
- Non-USD fiats are unavailable unless OER is configured.

### Phase 2 — Add OER forex for VND and long tail

- `OER_APP_ID` from Open Exchange Rates Developer ($12/mo, commercial).
- Backend fetches hourly USD->fiat matrix and derives:
  `XEC_in_VND = XEC_in_USD x USD_to_VND`.
- VND is in the default hot-fiat list, so it is direct-quoted on Builder
  (`CMC_CONVERT_LIMIT=8`) and forex-derived on Basic.

### Phase 3 — CMC Builder ($29/mo)

- Set `CMC_CONVERT_LIMIT=8`.
- Hot fiats are direct-quoted in one batched call; warm fiats rotate with long TTLs.
- Cold fiats remain forex-derived at zero CMC cost.

## Configuration

See `packages/app-lixi-api/.env.example` for the full list. Key variables:

| Variable | Default | Notes |
|---|---|---|
| `FIAT_RATE_PROVIDER` | `cmc-oer` | `cmc-oer` / `cmc` / `legacy` |
| `FIAT_RATE_LEGACY_FALLBACK_ENABLED` | `true` | Fall back to Bitcore if new providers fail |
| `CMC_API_KEY` | — | Required for new providers |
| `CMC_CONVERT_LIMIT` | `1` | 1 Basic, 8 Builder, 40 Startup |
| `CMC_COINS` | `XEC,BTC,BCH,ETH,DOGE,XRP,LTC,USDT,USDC` | XPI is not on CMC; manual pricing still applies |
| `FIAT_RATE_HOT_FIATS` | `USD,EUR,VND,IDR,NGN,PHP,BRL,INR` | Direct CMC, 10-min TTL |
| `FIAT_RATE_WARM_FIATS` | 16 majors | Direct CMC, 2-hr TTL |
| `FIAT_RATE_MERGED_TTL` | `300` | Merged GraphQL cache |
| `OER_APP_ID` | — | Required for Phase 2 long tail |
| `OER_TTL` | `3600` | Forex cache |

## Tiering and credits

- Basic free: 15k credits/mo, 1 convert/call. XEC-USD at 5-min cache is ~8.6k/mo.
- Builder: 150k credits/mo, 8 converts/call. Hot tier in one call (~8 credits).
- Warm fiats are cached 2h; cold fiats cost zero CMC credits (OER-derived).

## Fallback and alerts

- New providers fail -> legacy Bitcore (if enabled) -> Telegram `FALLBACK_USED`.
- All fail -> Telegram `ALL_ENDPOINTS_FAILED` and GraphQL error (preserved behavior).
- `getFiatRate` still returns `[]` on total failure (preserved behavior).

## Testing

```bash
cd packages/app-lixi-api
pnpm test fiat-rate
```

Specs cover config parsing, merge/derive math, Redis merged caching, and
free-tier convert behavior without live API keys.

## Upgrade checklist

- [ ] Add `CMC_API_KEY` (and `OER_APP_ID` for Phase 2) to staging/prod secrets.
- [ ] Verify `getAllFiatRate` returns XEC and VND entries with non-zero rates.
- [ ] Confirm Telegram fallback alerts fire on simulated provider outage.
- [ ] After Builder upgrade, set `CMC_CONVERT_LIMIT=8`.
- [ ] Disable legacy fallback (`FIAT_RATE_LEGACY_FALLBACK_ENABLED=false`) once stable.
