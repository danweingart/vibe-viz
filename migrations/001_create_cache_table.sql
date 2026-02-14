-- Migration: Create cache_entries table for persistent caching
-- This replaces in-memory cache that gets destroyed on serverless cold starts

CREATE TABLE IF NOT EXISTS cache_entries (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Index for efficient expiration queries
CREATE INDEX IF NOT EXISTS idx_cache_expires ON cache_entries(expires_at);

-- Index for updated_at (useful for debugging/monitoring)
CREATE INDEX IF NOT EXISTS idx_cache_updated ON cache_entries(updated_at);

-- Verify table was created
SELECT 'Cache table created successfully' AS status;
