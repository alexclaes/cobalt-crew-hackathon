-- Database schema for trip planning app
-- Run this in Vercel Postgres dashboard or via migration

-- Table for trip themes
CREATE TABLE IF NOT EXISTS trip_themes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL UNIQUE,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Insert the 8 predefined themes
INSERT INTO trip_themes (name) VALUES
  ('City trip'),
  ('Food & drink'),
  ('Cultural'),
  ('Adventure'),
  ('Nature'),
  ('Family-Friendly'),
  ('Wellness'),
  ('Shopping')
ON CONFLICT (name) DO NOTHING;

-- Table for trips
CREATE TABLE IF NOT EXISTS trips (
  id UUID PRIMARY KEY,
  created_at TIMESTAMP DEFAULT NOW(),
  users JSONB NOT NULL,
  theme_id UUID REFERENCES trip_themes(id)
);

-- Index for sorting trips by creation date
CREATE INDEX IF NOT EXISTS idx_trips_created_at ON trips(created_at DESC);

-- Example query to verify table creation:
-- SELECT * FROM trips LIMIT 10;
-- SELECT * FROM trip_themes;
