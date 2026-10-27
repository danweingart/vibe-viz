BEGIN;

-- Receipts attributed to GVC secondary sales, NOT NFT sale volume * a fee rate.
-- ETH and WETH are denominated in ETH. Other currencies require a deliberate
-- schema/valuation extension; do not attest full coverage while omitting them.
CREATE TABLE IF NOT EXISTS gvc_royalty_payments (
  chain_id INTEGER NOT NULL DEFAULT 1 CHECK (chain_id = 1),
  tx_hash TEXT NOT NULL CHECK (tx_hash ~ '^0x[0-9a-f]{64}$'),
  payment_id TEXT NOT NULL CHECK (length(payment_id) BETWEEN 1 AND 200),
  recipient TEXT NOT NULL CHECK (recipient ~ '^0x[0-9a-f]{40}$'),
  collection_address TEXT NOT NULL DEFAULT '0xb8ea78fcacef50d41375e44e6814ebba36bb33c4'
    CHECK (collection_address = '0xb8ea78fcacef50d41375e44e6814ebba36bb33c4'),
  paid_at TIMESTAMPTZ NOT NULL,
  currency TEXT NOT NULL CHECK (currency IN ('ETH', 'WETH')),
  amount_wei NUMERIC(78, 0) NOT NULL CHECK (amount_wei > 0),
  eth_usd NUMERIC(24, 8) CHECK (eth_usd > 0),
  fx_source TEXT,
  evidence TEXT NOT NULL CHECK (length(evidence) > 0),
  source TEXT NOT NULL CHECK (length(source) > 0),
  imported_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (chain_id, tx_hash, payment_id),
  CHECK ((eth_usd IS NULL AND fx_source IS NULL) OR (eth_usd IS NOT NULL AND fx_source IS NOT NULL AND length(fx_source) > 0))
);

-- payment_id identifies the underlying payout (e.g. log:42 or trace:0_2),
-- not the NFT/token or indexer's row id. A sweep payout must be counted once.
CREATE INDEX IF NOT EXISTS idx_gvc_royalty_paid_at ON gvc_royalty_payments(paid_at);

-- Each row attests coverage from UTC month start to covered_through (exclusive).
-- complete=true means ALL relevant receipts in that interval were reconciled.
CREATE TABLE IF NOT EXISTS gvc_royalty_coverage (
  month DATE PRIMARY KEY CHECK (EXTRACT(DAY FROM month) = 1),
  covered_through TIMESTAMPTZ NOT NULL,
  complete BOOLEAN NOT NULL DEFAULT FALSE,
  source TEXT NOT NULL CHECK (length(source) > 0),
  verified_by TEXT NOT NULL CHECK (length(verified_by) > 0),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (covered_through > month::timestamp AT TIME ZONE 'UTC'),
  CHECK (covered_through <= (month + INTERVAL '1 month')::timestamp AT TIME ZONE 'UTC')
);

COMMIT;
