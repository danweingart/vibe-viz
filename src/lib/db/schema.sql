-- VIBESTR Snapshots Table
-- Stores daily snapshots of NFT strategy data for accurate historical tracking

CREATE TABLE IF NOT EXISTS vibestr_snapshots (
  id SERIAL PRIMARY KEY,
  date DATE NOT NULL UNIQUE,
  timestamp BIGINT NOT NULL,
  data JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Index for faster date-based queries
CREATE INDEX IF NOT EXISTS idx_vibestr_snapshots_date ON vibestr_snapshots(date DESC);

-- Index for timestamp queries
CREATE INDEX IF NOT EXISTS idx_vibestr_snapshots_timestamp ON vibestr_snapshots(timestamp DESC);

-- Metadata table for tracking snapshot coverage
CREATE TABLE IF NOT EXISTS vibestr_snapshot_meta (
  id INTEGER PRIMARY KEY DEFAULT 1,
  first_snapshot DATE,
  last_snapshot DATE,
  snapshot_count INTEGER DEFAULT 0,
  version VARCHAR(10) DEFAULT '1.0.0',
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT single_row CHECK (id = 1)
);

-- Initialize metadata row
INSERT INTO vibestr_snapshot_meta (id)
VALUES (1)
ON CONFLICT (id) DO NOTHING;
