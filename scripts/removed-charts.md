# Temporarily Removed VIBESTR Charts

## Overview

8 charts were removed from the VIBESTR dashboard on 2026-01-25 because they require historical price, volume, and liquidity data that is not available from any API.

## Data Limitation

The NFTStrategy API only provides **current snapshots**, not historical data. Blockchain events can provide holder counts and burn amounts, but cannot provide token prices, trading volumes, or liquidity depth from past dates.

## Removed Charts

### From Section 01: Burn Tracking & Supply (2 charts)

1. **TokenPriceChart** - `src/components/charts/vibestr/TokenPriceChart.tsx`
   - Requires: Historical token price in USD
   - Status: Ready to reinstate once we have 7+ days of snapshots
   - Data source: Daily snapshots from NFTStrategy API

2. **TradingVolumeChart** - `src/components/charts/vibestr/TradingVolumeChart.tsx`
   - Requires: Historical 24h trading volume
   - Status: Ready to reinstate once we have 7+ days of snapshots
   - Data source: Daily snapshots from NFTStrategy API

### From Section 02: NFT Holdings & Treasury (2 charts)

3. **PriceVsFloorChart** - `src/components/charts/vibestr/PriceVsFloorChart.tsx`
   - Requires: Historical token price and NFT floor price
   - Status: Ready to reinstate once we have 30+ days of snapshots
   - Data source: Daily snapshots from NFTStrategy + OpenSea APIs

4. **LiquidityDepthChart** - `src/components/charts/vibestr/LiquidityDepthChart.tsx`
   - Requires: Historical liquidity depth data
   - Status: Ready to reinstate once we have 30+ days of snapshots
   - Data source: Daily snapshots from NFTStrategy API

### From Section 03: Performance & Market (4 charts removed - entire section)

5. **TokenVolatilityChart** - `src/components/charts/vibestr/TokenVolatilityChart.tsx`
   - Requires: Historical price data for volatility calculation
   - Status: Ready to reinstate once we have 30+ days of snapshots
   - Data source: Daily snapshots from NFTStrategy API

6. **CumulativeTradingVolumeChart** - `src/components/charts/vibestr/CumulativeTradingVolumeChart.tsx`
   - Requires: Historical volume for cumulative sum
   - Status: Ready to reinstate once we have 30+ days of snapshots
   - Data source: Daily snapshots from NFTStrategy API

7. **ProfitLossDistributionChart** - `src/components/charts/vibestr/ProfitLossDistributionChart.tsx`
   - Requires: Historical buy/sell prices for P&L calculation
   - Status: Ready to reinstate once we have 30+ days of snapshots
   - Data source: Daily snapshots + blockchain transaction analysis

8. **TokenHealthIndicatorsChart** - `src/components/charts/vibestr/TokenHealthIndicatorsChart.tsx`
   - Requires: Historical volume and liquidity for health scores
   - Status: Ready to reinstate once we have 30+ days of snapshots
   - Data source: Daily snapshots from NFTStrategy API

## Data Accumulation Timeline

| Days Collected | Charts Available to Reinstate                    | Recommended Action                                    |
| -------------- | ------------------------------------------------ | ----------------------------------------------------- |
| 7 days         | TokenPriceChart, TradingVolumeChart              | Reinstate simple price/volume charts                  |
| 14 days        | Add PriceVsFloorChart, LiquidityDepthChart       | Add comparison charts                                 |
| 30 days        | All 8 charts (recommended minimum)              | Reinstate full dashboard with all removed charts      |
| 90 days        | Full historical context for all metrics          | Optimal - all charts show meaningful trend data       |

## How to Reinstate

Once sufficient daily snapshots have been collected via the Vercel cron job:

### 1. Uncomment imports in `src/app/vibestr/page.tsx`

```tsx
import {
  // Section 01: Burn Tracking & NFT Holdings
  BurnMetricsChart,
  BurnProgressChart,
  HoldingsBreakdownChart,
  HoldingsValueChart,
  // Section 02: Trader & Holder Activity
  DailyActiveTradersChart,
  HolderActivityChart,
  TokenHolderDistributionChart,
  AverageHoldTimeChart,
  // UNCOMMENT THESE AFTER 7+ DAYS:
  TokenPriceChart,
  TradingVolumeChart,
  // UNCOMMENT THESE AFTER 30+ DAYS:
  PriceVsFloorChart,
  LiquidityDepthChart,
  TokenVolatilityChart,
  ProfitLossDistributionChart,
  TokenHealthIndicatorsChart,
  CumulativeTradingVolumeChart,
} from "@/components/charts/vibestr";
```

### 2. Add back sections to page layout

**After 7 days, update Section 01:**

```tsx
{/* Section 01: Burn Tracking & Supply */}
<section className="mb-8">
  <SectionHeader number="01" title="Burn Tracking & Supply" />
  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
    <BurnMetricsChart />
    <BurnProgressChart />
    <TokenPriceChart />         {/* REINSTATE */}
    <TradingVolumeChart />      {/* REINSTATE */}
  </div>
</section>
```

**After 14 days, update Section 02:**

```tsx
{/* Section 02: NFT Holdings & Treasury */}
<section className="mb-8">
  <SectionHeader number="02" title="NFT Holdings & Treasury" />
  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
    <HoldingsBreakdownChart />
    <HoldingsValueChart />
    <PriceVsFloorChart />       {/* REINSTATE */}
    <LiquidityDepthChart />     {/* REINSTATE */}
  </div>
</section>
```

**After 30 days, add Section 03:**

```tsx
{/* Section 03: Performance & Market */}
<section className="mb-8">
  <SectionHeader number="03" title="Performance & Market" />
  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
    <TokenVolatilityChart />
    <ProfitLossDistributionChart />
    <TokenHealthIndicatorsChart />
    <CumulativeTradingVolumeChart />
  </div>
</section>
```

**Final layout after 30 days (4 sections, 16 charts total):**

```tsx
{/* Section 01: Burn Tracking & Supply */}
<BurnMetricsChart />
<BurnProgressChart />
<TokenPriceChart />
<TradingVolumeChart />

{/* Section 02: NFT Holdings & Treasury */}
<HoldingsBreakdownChart />
<HoldingsValueChart />
<PriceVsFloorChart />
<LiquidityDepthChart />

{/* Section 03: Performance & Market */}
<TokenVolatilityChart />
<ProfitLossDistributionChart />
<TokenHealthIndicatorsChart />
<CumulativeTradingVolumeChart />

{/* Section 04: Trader & Holder Activity */}
<DailyActiveTradersChart />
<HolderActivityChart />
<TokenHolderDistributionChart />
<AverageHoldTimeChart />
```

### 3. Test data availability

Before reinstating charts, verify sufficient data exists:

```bash
# Check snapshot count and date range
curl http://localhost:3000/api/vibestr/snapshot | jq '.coverage'

# Example response after 30 days:
# {
#   "snapshots": 30,
#   "firstDate": "2025-12-26",
#   "lastDate": "2026-01-25",
#   "hasPriceData": true,
#   "hasVolumeData": true
# }
```

### 4. Verify charts render correctly

After uncommenting and adding charts back:

1. Navigate to http://localhost:3000/vibestr
2. Verify all charts render without errors
3. Check that data displays meaningful trends (not just flat lines)
4. Test time range toggles (7/30/90 days)
5. Verify PNG export works for all charts
6. Check for any console errors in browser dev tools

## Cron Job Status

Daily snapshots are collected automatically via Vercel cron job:

- **Endpoint:** `/api/vibestr/snapshot`
- **Schedule:** Every day at 00:00 UTC (midnight)
- **Configuration:** `vercel.json` crons section
- **Data captured:** Token price, volume, liquidity, holder counts, burn amounts

### Check snapshot coverage:

```bash
# Get latest snapshot with coverage info
curl https://vibe-viz.vercel.app/api/vibestr/snapshot

# Expected response:
# {
#   "success": true,
#   "snapshot": { ... },
#   "coverage": {
#     "snapshots": 30,
#     "firstDate": "2025-12-26",
#     "lastDate": "2026-01-25"
#   }
# }
```

### Manually trigger snapshot (for testing):

```bash
curl -X POST https://vibe-viz.vercel.app/api/vibestr/snapshot
```

### View Vercel cron logs:

```bash
vercel logs --follow
```

## Backfill Script

A blockchain backfill script was created to populate 90 days of historical burn and NFT activity data:

**Script:** `scripts/backfill-blockchain-data.ts`

**Run it:**

```bash
npx ts-node --esm scripts/backfill-blockchain-data.ts
```

**What it does:**

- Queries Ethereum blockchain for last 90 days of events
- Extracts VIBESTR burn transactions (transfers to 0x000...dEaD)
- Tracks GVC NFT purchases and sales by the strategy contract
- Aggregates data by day and stores in Postgres
- Populates `burnedAmount`, `holdingsCount`, and `activeTraders` fields

**Note:** The backfill script only populates blockchain-derived data. Price, volume, and liquidity data will accumulate over time via the daily cron job.

## Database Schema

Snapshots are stored in the `vibestr_snapshots` table:

```sql
CREATE TABLE vibestr_snapshots (
  id SERIAL PRIMARY KEY,
  date DATE NOT NULL UNIQUE,
  timestamp INTEGER NOT NULL,
  data JSONB NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Example data structure:
{
  "burnedAmount": "1500000000000000000000",  -- From blockchain
  "holdingsCount": 15,                        -- From blockchain
  "activeTraders": 23,                        -- From blockchain
  "poolData": {
    "price_usd": 0.00042,                     -- From cron snapshots
    "volume_24h": 1250.50,                    -- From cron snapshots
    "liquidity_usd": 50000,                   -- From cron snapshots
    "market_cap_usd": 420000                  -- From cron snapshots
  },
  "source": "blockchain_backfill",
  "nftPurchases": 3,
  "nftSales": 1
}
```

## Notes

- All 8 charts remain in the codebase - they are NOT deleted
- Chart components are fully implemented and tested
- Only the page layout was modified to exclude them temporarily
- No changes to hooks, API routes, or data transformations needed for reinstatement
- The charts will automatically work once sufficient snapshot data exists

## Questions?

If you encounter issues during reinstatement:

1. Check database has sufficient snapshots: `SELECT COUNT(*) FROM vibestr_snapshots;`
2. Verify data completeness: `SELECT * FROM vibestr_snapshots ORDER BY date DESC LIMIT 5;`
3. Check API routes work: `curl http://localhost:3000/api/vibestr/price-history?days=30`
4. Review browser console for errors when charts render

For data quality issues, check:

- Vercel cron job logs for snapshot failures
- NFTStrategy API availability
- Database connection and query errors
