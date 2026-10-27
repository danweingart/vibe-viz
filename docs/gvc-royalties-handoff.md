# GVC royalties: handoff for Dan / his agent

The feature is built in draft PR https://github.com/danweingart/vibe-viz/pull/2. It adds `/royalties`, with no navigation link, using the existing dashboard components. It shows 12 completed UTC months, ETH-equivalent and USD totals, MoM, and separate current-month receipts. `/preview/royalties` is development-only and uses **made-up sample amounts**.

**The wallet sync and SQL are included. You do not need to build an extractor.** A live, read-only backfill succeeded for September 2025 through October 2026 MTD. No production data has been imported or deployed yet.

## What you need to supply

- The royalty receiving wallet is **`0x4b8796671c12dbe98ce5bced349c25b8ac2ac26c`**, discovered via `royaltyInfo(1, 1 ETH)` on the GVC contract. It matches the constructor recipient. This verifies deployment and current settings, not the absence of every intermediate change; confirm recipient continuity before final sign-off. Etherscan’s proxy returned current state even for a pre-deployment block tag, so those calls were not treated as historical proof. The configured rate is 5%, but the dashboard sums actual payments; it never multiplies sales volume by 5%. The team confirms the wallet is for GVC. Confirm its secondary-sale-only purpose and review the direct deposits below before enabling imports.
- An Etherscan API key with access to normal transactions, internal transactions and logs, plus the existing Postgres credentials. Keep these in `.env.local` / your worker secrets.

This small collector deliberately supports one dedicated royalty wallet. If the wallet changed, is a mixed-use treasury, or receives both original royalties and redistributed royalties, use the included reviewed JSON importer after classifying receipts; do not enable the dedicated-wallet confirmation. The script cannot infer the purpose of every deposit from an address alone.

## Run it

From the repo root, install dependencies and set:

```dotenv
GVC_ROYALTY_WALLET=0x4b8796671c12dbe98ce5bced349c25b8ac2ac26c
ETHERSCAN_API_KEY=REPLACE_WITH_API_KEY
POSTGRES_URL=REPLACE_WITH_EXISTING_DATABASE_URL
POSTGRES_URL_NON_POOLING=REPLACE_WITH_DIRECT_DATABASE_URL
```

`POSTGRES_URL_NON_POOLING` is preferred for the import transaction; the importer falls back to `POSTGRES_URL`. The web app uses `POSTGRES_URL`.

```sh
npm ci
npm run test:royalties

# Read-only crawl; saves receipt JSON locally in ignored .royalties/.
# No Postgres writes. Covers 13 completed months plus current MTD.
npm run royalties:sync -- --backfill
```

Check the exports against the wallet history (including an ETH payment and a WETH payment). The live scan found **587 tiny direct ETH deposits totaling 0.000154899604363824 ETH** in the backfill window, with no sale attribution established. The separately supplied `GVC-Receipt-Exclusions-REVIEW.json` contains their exact transaction IDs and amounts; it is a candidate list, not an approved exclusion list.

Review that list, retain only confirmed unrelated deposits, and set `GVC_ROYALTY_EXCLUSIONS=/secure/path/reviewed-exclusions.json`. The schema is an array of `{txHash, paymentId, reason}` (extra audit fields are allowed). The sync records excluded receipts in separate monthly `*-excluded.json` files. A direct ETH deposit that remains included stops automatic publication of that month; legitimate direct royalties can be included through the reviewed JSON importer. This avoids silently treating unsolicited dust as revenue without dropping small actual royalties by an arbitrary threshold.

Once the wallet's dedicated use and exclusions are confirmed, add `GVC_ROYALTY_WALLET_CONFIRMED=true` to `.env.local` or worker secrets.

Run `migrations/003_create_gvc_royalties.sql` in the intended Postgres SQL console. Alternatively, with the connection URL exported into your shell:

```sh
psql "$POSTGRES_URL_NON_POOLING" -v ON_ERROR_STOP=1 -f migrations/003_create_gvc_royalties.sql
npm run royalties:sync -- --backfill --apply
psql "$POSTGRES_URL_NON_POOLING" -v ON_ERROR_STOP=1 -f scripts/query-gvc-royalties.sql
```

The migration creates two small tables: timestamped receipts and monthly coverage. The query file gives monthly ETH, WETH, combined ETH-equivalent, historical USD, coverage, and receipt-level details. All ingestion and frontend queries are already written.

Schedule this command daily in the existing worker/CI, from the repo root with the same environment:

```sh
npm run royalties:sync -- --apply
```

It refreshes the previous and current month, including month rollover. Rerun `--backfill --apply` for older corrections or after a long outage. The first backfill includes one extra month for the first visible MoM comparison. At the October 2026 run date, that means September 2025 onward, with October 2025–September 2026 displayed as completed months.

## What the sync does

- Reads direct ETH receipts, internal ETH transfers, and Transfer logs from canonical mainnet WETH (`0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2`). Saves original currency, integer wei, block timestamp and transaction hash. WETH uses its log index; internal ETH is summed exactly once per transaction because the live Etherscan response repeats trace IDs across distinct payouts in batch sales.
- Excludes failed transfers, zero amounts, outgoing/self transfers, WETH mint transfers and native ETH returned by the WETH contract on unwrap. Deduplicates WETH log identities and excludes repeated root ETH transfers. Wrapping/unwrapping must not count the same royalty twice.
- Splits block ranges whenever a response reaches 1,000 records. Errors, malformed responses and an unsplittable saturated block stop the sync rather than becoming a zero month. Uses a one-hour indexing/confirmation buffer; this is not a cryptographic finality check or independent indexer reconciliation.
- Fetches hourly historical ETH/USD reference quotes from DefiLlama in batches near each receipt timestamp. Requires a positive quote within one hour and records the provider's actual quote timestamp. ETH and WETH use the same ETH reference price. This is a historical reference valuation, not an exact execution price or today's mark-to-market value. This matches the requested price-at-receipt convention.
- Saves a full JSON export, then atomically replaces that month's Postgres snapshot when `--apply` is given. Repeating a run does not duplicate payments. Older coverage cutoffs are rejected. A failure leaves the affected month unchanged; earlier months successfully committed in the same run remain committed.

The job is a CLI, not a public write endpoint, and adds no runtime dependency. Run it outside frontend request handlers. No new Docker/container service is required.

## App / verification

After backfill and deployment, check `/api/royalties` and `https://goodvibesclub.info/royalties`. The page is public but has no added navigation link; typing the URL is sufficient. It reads Postgres every five minutes. Missing coverage remains blank rather than becoming zero. Twelve-month totals require all twelve months. MTD is excluded from completed-month MoM.

Validation in this branch: royalty unit tests, TypeScript, lint, and SQL import/aggregation checks. Live Etherscan and historical-price extraction has succeeded for the full requested window, without database writes. Production import and receipt classification remain for review; sample preview numbers are still entirely synthetic.

For mixed-use wallets or manual corrections, the existing fallback is:

```sh
npm run royalties:import -- /path/to/reviewed-month.json
npm run royalties:import -- /path/to/reviewed-month.json --apply
```

Its typed JSON contract is `RoyaltyImport` in `src/lib/royalties/import.ts`; the sync exports already match it. Supply the **entire** month-to-cutoff dataset, never a delta. `paymentId` is `normal:0`, `internal:0` (the transaction’s internal ETH sum), `trace:<traceId>` for independently verified canonical traces, or `log:<logIndex>`. Do not mix transaction sums and component traces for the same payout. Only mark `complete: true` after reconciliation. Unpriced manually imported receipts can retain ETH while USD stays blank.

Provider references: [Etherscan normal transactions](https://docs.etherscan.io/api-reference/endpoint/txlist), [internal transactions](https://docs.etherscan.io/api-reference/endpoint/txlistinternal), [filtered event logs](https://docs.etherscan.io/api-reference/endpoint/getlogs-address-topics), and [DefiLlama price API](https://api-docs.defillama.com/llms-free.txt).

## Supplied files

Alongside this handoff: `003_create_gvc_royalties.sql`, `query-gvc-royalties.sql`, `GVC-Receipt-Exclusions-REVIEW.json`, and `GVC-Wallet-Receipts-Unverified.zip`. The ZIP contains real wallet receipts and historical price references from the successful read-only crawl, with `complete: false`. It includes candidate non-royalty direct deposits; do not treat its raw sums as approved royalty totals or change coverage to true without review. Re-running the sync with approved exclusions produces the import-ready snapshots.
