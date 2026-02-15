-- Migration: Create price_cache table for persistent price enrichment data
-- Eliminates N+1 query pattern by caching tx_hash → price mappings in Postgres

CREATE TABLE IF NOT EXISTS price_cache (
  tx_hash TEXT PRIMARY KEY,
  price_eth DECIMAL(18, 8) NOT NULL,
  price_usd DECIMAL(18, 2),
  payment_token VARCHAR(10) NOT NULL,
  payment_symbol VARCHAR(20),
  protocol TEXT,
  image_url TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Index for cleanup queries (though prices are immutable, we may want to prune very old data)
CREATE INDEX IF NOT EXISTS idx_price_cache_created ON price_cache(created_at);

-- Verify table was created
SELECT 'Price cache table created successfully' AS status;
