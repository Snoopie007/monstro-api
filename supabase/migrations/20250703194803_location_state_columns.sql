-- ============================================================================
-- ADD MISSING COLUMNS TO LOCATION_STATE TABLE
-- 
-- This migration adds columns that exist in the Drizzle schema but were
-- missing from the initial migration:
-- - premium_support (boolean)
-- - waiver_id (text with FK to contracts)
--
-- Must run AFTER contracts_tables.sql (20250703194802)
-- ============================================================================

-- Add premium_support column
ALTER TABLE location_state 
ADD COLUMN IF NOT EXISTS premium_support boolean NOT NULL DEFAULT false;

-- Add waiver_id column with FK to contracts
ALTER TABLE location_state 
ADD COLUMN IF NOT EXISTS waiver_id text;

-- Add foreign key constraint for waiver_id
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'location_state_waiver_id_fkey'
  ) THEN
    ALTER TABLE location_state 
    ADD CONSTRAINT location_state_waiver_id_fkey 
    FOREIGN KEY (waiver_id) REFERENCES contracts (id) ON DELETE SET NULL;
  END IF;
END $$;

