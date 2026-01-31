-- Database schema for trip planning app
-- Run this in Vercel Postgres dashboard or via migration

CREATE TABLE IF NOT EXISTS trips (
  id UUID PRIMARY KEY,
  created_at TIMESTAMP DEFAULT NOW(),
  users JSONB NOT NULL
);

-- Index for sorting trips by creation date
CREATE INDEX IF NOT EXISTS idx_trips_created_at ON trips(created_at DESC);

-- Example query to verify table creation:
-- SELECT * FROM trips LIMIT 10;
