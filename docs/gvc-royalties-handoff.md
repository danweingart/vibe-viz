# GVC secondary-sale royalties: handoff for Dan and his agent

## Outcome and current status

Implement and operate verified monthly **Good Vibes Club NFT secondary-sale royalties received**, in ETH and historical USD. Exclude primary mint revenue, gross NFT sales, marketplace/platform fees, transfers unrelated to sales, and VIBESTR token fees.

The application work is implemented in this branch:

- A standalone `/royalties` page, accessible by typing the URL, with no added navigation link or homepage section. It reuses `SectionHeader`, `StatCard`, `StandardChartCard`, Recharts, the existing currency context, and chart export. The intended production URL is `https://goodvibesclub.info/royalties`.
- Twelve completed UTC calendar months, a 12-month total, monthly ETH/USD table, currency-specific month-over-month changes, and a separate month-to-date card.
- `GET /api/royalties`, reading the new Postgres payment ledger and coverage records. No upstream blockchain requests on page load. React Query refreshes every five minutes.
- Migration `migrations/003_create_gvc_royalties.sql` and a validated, transactional monthly snapshot importer, `scripts/import-gvc-royalties.ts`.
- Development-only `/preview/royalties` with clearly labeled synthetic sample data, partial-history and empty states. Production returns 404 for this preview. Sample amounts never enter the real API or database.

**Production data has not been backfilled. No recipient wallets or actual royalty totals have been verified. No production database changes or deployment have been performed.** Dan's remaining work is data-source verification, the historical extraction/reconciliation, imports, and the scheduled ingestion job. This requires the team's recipient records and infrastructure access; it does not require Dan personally if his agent has those inputs.

## Required decisions and inputs

1. Confirm every GVC royalty recipient wallet/splitter and the block/date interval during which each was active. The NFT collection contract is `0xb8ea78fcacef50d41375e44e6814ebba36bb33c4`, Ethereum mainnet, chain ID 1. It is **not automatically the payment recipient**.
2. Choose one accounting boundary: receipt at the creator's royalty collector/splitter, or downstream beneficiary disbursement. Prefer the first collection receipt. Never count both the splitter's incoming royalty and its onward distributions. If the collector holds money before payout, state that this dashboard measures collector receipts.
3. Provide an indexer/export with transaction receipts, ETH internal transfer traces, WETH transfer logs, marketplace sale attribution, pagination, and sufficient historical access. An existing finance export is suitable if it supplies this evidence. Recipient inflows alone are insufficient: exclude treasury moves, refunds, gifts, and other collections' royalties.
4. Choose and record a historical ETH/USD provider and methodology. Recommended policy: each payment's UTC-date daily closing/reference rate, consistently sourced; document the exact provider convention in `fxSource`. For today's unclosed daily rate, use null and refresh when finalized rather than substituting spot prices. The UI never calls the current ETH quote for this feature.
5. Use the project's production Postgres credentials on Dan's machine/CI. The web app uses `POSTGRES_URL`; the importer prefers `POSTGRES_URL_NON_POOLING` for its dedicated transaction connection, falling back to `POSTGRES_URL`. Do not put secrets in Git or Slack.

## Historical extraction work for the agent

Backfill **13 completed months plus the current month to a finalized cutoff**: twelve visible months plus one hidden baseline for the first MoM calculation. As of 2026-10-26, extract from **2025-09-01 00:00 UTC**; the chart displays October 2025–September 2026, with October 2026 shown separately as MTD. Compute these dates from the run date in future runs. Use finalized chain data and record a timestamp cutoff exclusive of the first unprocessed block.

The existing `/api/price-history?days=365` is NOT an adequate extraction source. It fetches at most 1,000 recent NFT transfers, enriches prices rather than royalty receipts, and converts USD using today's price. Do not multiply that volume by a fixed royalty percentage.

For each real secondary sale, attribute its actual creator payout using the order/receipt and approved recipient history. Include enforced, optional, and zero-royalty sales in the reconciliation, but store only positive royalty payments. Fully paginate every marketplace and date/block range. Use actual paid amounts, not the configured royalty rate. For mixed-collection bundles, store only the evidenced GVC-attributable portion and document that allocation. Do not assert complete coverage if attribution is unresolved.

Canonical receipt identity is `(chain_id, tx_hash, payment_id)`:

- ETH: `paymentId = "trace:0_2"` (stable canonical call-trace address for the actual payout).
- WETH: `paymentId = "log:42"` (receipt log index of the actual ERC-20 payout).
- Count a sweep payout once, even if several NFTs generated it. Do not emit both a trace and a log representation for the same economic payout. Distinct payouts in one transaction have distinct canonical IDs.
- `amountWei` is the GVC royalty amount in integer wei, encoded as a string. ETH and WETH both have 18 decimals. Keep exact integers until database aggregation.
- `ethUsd` is a positive decimal string or null; `fxSource` must accompany a non-null rate and identify the provider, UTC pricing date, and convention. Do not store zero for an unknown rate.
- Save evidence identifying the sale and creator-payment attribution. `evidence` can link to the transaction and include trace/log/order details.

**This initial ledger supports ETH and WETH only.** Audit for other payment currencies. If present, extend the ledger, importer, conversion logic, tests and UI disclosures before claiming complete collection-wide coverage. Do not silently discard those royalties or treat a token unit as ETH.

## Migration

First run the migration against staging, then the intended production database after review. It adds two tables and an index; it does not modify existing tables.

```sh
psql "$POSTGRES_URL_NON_POOLING" -v ON_ERROR_STOP=1 -f migrations/003_create_gvc_royalties.sql
```

Alternatively run the exact SQL file in the database console. The migration is transactional and rerunnable. `gvc_royalty_payments` stores receipts with exact numeric amounts and FX provenance; `gvc_royalty_coverage` records reviewed coverage by month. Keep the ingestion role's write access separate from frontend read access where the deployment supports it. Do not add a public unauthenticated import endpoint.

## Import contract and commands

Produce one JSON file per UTC month. This template intentionally contains invalid placeholders: replace them with verified data before running the importer.

```json
{
  "month": "2026-09",
  "coveredThrough": "2026-10-01T00:00:00.000Z",
  "complete": true,
  "source": "PROVIDER / export identifier / reconciliation report",
  "verifiedBy": "REVIEWER or reviewed pipeline version",
  "payments": [
    {
      "txHash": "REPLACE_WITH_REAL_0x_TRANSACTION_HASH",
      "paymentId": "log:42",
      "recipient": "REPLACE_WITH_VERIFIED_0x_RECIPIENT",
      "paidAt": "2026-09-12T12:34:56.000Z",
      "currency": "WETH",
      "amountWei": "REPLACE_WITH_ACTUAL_INTEGER_WEI",
      "ethUsd": "REPLACE_WITH_HISTORICAL_RATE",
      "fxSource": "PROVIDER / 2026-09-12 UTC / daily close convention",
      "evidence": "TRANSACTION URL plus sale/order and royalty-payment attribution"
    }
  ]
}
```

`complete: true` is an explicit attestation that **all** applicable royalties between UTC month start and the exclusive `coveredThrough` boundary were reconciled. It is never inferred from the number of imported rows. A historical complete month must end at the next month's boundary. A current-month complete snapshot may end at a finalized timestamp within that month. Use `complete: false` for unresolved gaps; its amounts remain hidden. A verified no-receipt month is `complete: true, payments: []`. An absent coverage row means unknown, not zero.

```sh
npm ci
npm run test:royalties

# Validates locally; no database connection or writes by default.
npm run royalties:import -- /secure/path/2026-09.json

# Explicitly writes a reviewed, complete month-to-cutoff snapshot.
npm run royalties:import -- /secure/path/2026-09.json --apply
```

**Important: `--apply` atomically replaces all receipts for the selected month. Supply the full month-to-cutoff dataset, never incremental new rows.** Keep source exports/backups so earlier snapshots can be reconstructed. Repeating the same snapshot does not double-count. A failed insert rolls back both deletion and coverage updates. Older cutoffs are rejected; corrections should use the same or later cutoff. A cross-month timestamp correction requires correcting both affected snapshots. Concurrent imports are serialized with an advisory transaction lock.

The importer validates timestamp boundaries, currencies, exact amount strings, payment IDs, duplicate payouts and FX provenance. It cannot independently prove a wallet is a royalty recipient or that a source is complete; those checks belong in the reconciliation pipeline and reviewer attestation.

## Ongoing ingestion and deployment

1. Implement the provider-specific extractor using the confirmed recipient history. Keep its block checkpoints, raw evidence, reconciliation counts and failure logs outside Git. The extractor is not included because the recipients/provider are not yet known.
2. Run it daily (or hourly if needed) in a scheduled worker/CI job with private credentials. Do not run the historical crawl inside a Vercel page request: this repo configures a 10-second function budget.
3. Re-export/import the entire current month to the new finalized cutoff. Reconcile recent finalized days for reorgs/late indexing and refresh missing daily USD rates. At month rollover, finish the prior month through the new UTC boundary. A prior month's partial cutoff becomes incomplete automatically in the UI.
4. Only advance coverage when the job has fully paginated, deduplicated, attributed, priced or flagged unpriced receipts, and reconciled them. If an upstream source fails, preserve the prior snapshot and last-success timestamp.
5. Deploy the branch after review and migrations. Verify `/api/royalties`, then `/royalties`. No new frontend secrets or external client API calls are needed. Until tables/data are ready, the page shows an honest pending state. The page has no navigation link; this is discoverability only, not access control. No authentication was added.

The frontend's five-minute refresh reads existing Postgres data; **it does not collect blockchain payments**. Freshness depends on the ingestion schedule. USD months with missing prices stay blank even when ETH is verified. Annual totals stay blank until all twelve respective currency totals are known. MoM is undefined for missing months or a zero baseline; current MTD is never compared against a full prior month.

## Reconciliation SQL

```sql
-- Coverage and ingestion freshness
SELECT month, covered_through, complete, source, verified_by, updated_at
FROM gvc_royalty_coverage ORDER BY month DESC;

-- Receipt totals and missing historical USD rates
SELECT date_trunc('month', paid_at AT TIME ZONE 'UTC')::date AS month,
       COUNT(*) AS payouts,
       SUM(amount_wei / 1000000000000000000::numeric) AS royalties_eth,
       CASE WHEN COUNT(*) FILTER (WHERE eth_usd IS NULL) = 0
            THEN SUM(amount_wei / 1000000000000000000::numeric * eth_usd)
       END AS royalties_usd,
       COUNT(*) FILTER (WHERE eth_usd IS NULL) AS missing_fx
FROM gvc_royalty_payments GROUP BY 1 ORDER BY 1;

-- Per-recipient reconciliation against your approved wallet list
SELECT recipient, currency, COUNT(*) AS payouts,
       SUM(amount_wei / 1000000000000000000::numeric) AS royalties_eth
FROM gvc_royalty_payments GROUP BY recipient, currency ORDER BY recipient;
```

## Acceptance checks

- Match at least three historical months and current MTD to independently reconciled source totals. Inspect a multi-NFT sweep, a zero-royalty sale, an ETH receipt, a WETH receipt, and recipient/splitter transitions if applicable.
- Check rerunning a monthly import leaves counts/totals unchanged; corrected imports replace rather than append. A failed import leaves the old month intact.
- Verify missing months display dashes and verified empty months display zero. Confirm changing the display currency changes chart, summary and MoM but the table retains both currencies.
- Verify USD uses payment-date rates and is not recalculated from spot ETH. Test missing FX, month rollover, December/January boundaries, and a zero prior-month baseline.
- Run `npm run test:royalties`, `npx tsc --noEmit`, `npm run build`, and targeted ESLint on the new royalty files. The lockfile also repairs the pre-existing missing Puppeteer dependency entries encountered by `npm ci`.

Local review: `npm run dev`, then `/preview/royalties` (sample/partial/empty modes). This is a UI demonstration, not financial backfill evidence.
