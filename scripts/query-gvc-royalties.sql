-- Monthly receipts: ETH and WETH separately, their combined ETH equivalent,
-- and historical USD. Raw totals for reconciliation; consult coverage below.
SELECT date_trunc('month', paid_at AT TIME ZONE 'UTC')::date AS month,
       COUNT(*) AS receipts,
       COALESCE(SUM(amount_wei) FILTER (WHERE currency = 'ETH'), 0) / 1e18::numeric AS native_eth,
       COALESCE(SUM(amount_wei) FILTER (WHERE currency = 'WETH'), 0) / 1e18::numeric AS weth,
       SUM(amount_wei) / 1e18::numeric AS total_eth_equivalent,
       CASE WHEN COUNT(*) FILTER (WHERE eth_usd IS NULL) = 0
            THEN SUM(amount_wei / 1e18::numeric * eth_usd) END AS historical_usd
FROM gvc_royalty_payments
GROUP BY 1 ORDER BY 1 DESC;

SELECT month, covered_through, complete, source, updated_at
FROM gvc_royalty_coverage ORDER BY month DESC;

-- Receipt-level audit: original currency, timestamp, amount, price and evidence.
SELECT paid_at, currency, amount_wei / 1e18::numeric AS amount,
       eth_usd, amount_wei / 1e18::numeric * eth_usd AS historical_usd,
       recipient, tx_hash, payment_id, fx_source, evidence
FROM gvc_royalty_payments ORDER BY paid_at DESC;
