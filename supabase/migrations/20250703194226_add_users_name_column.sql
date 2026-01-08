-- ============================================================================
-- ADD NAME COLUMN TO USERS TABLE
-- 
-- This migration adds the 'name' column to the users table if it doesn't exist.
-- The column is defined in the Drizzle schema but may be missing from some
-- databases due to schema drift.
-- ============================================================================

ALTER TABLE users ADD COLUMN IF NOT EXISTS name text;

-- Set a default value for existing rows (combining first part of email)
UPDATE users SET name = SPLIT_PART(email, '@', 1) WHERE name IS NULL;

-- Now make it NOT NULL
ALTER TABLE users ALTER COLUMN name SET NOT NULL;

