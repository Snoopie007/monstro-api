-- Create new status enum with all 4 values
DO $$ BEGIN
  CREATE TYPE migrate_status AS ENUM ('pending', 'processing', 'completed', 'failed');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Rename table from import_members to migrate_members
ALTER TABLE IF EXISTS import_members RENAME TO migrate_members;

-- Add new timestamp columns
ALTER TABLE migrate_members
  ADD COLUMN IF NOT EXISTS declined_on TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS viewed_on TIMESTAMP WITH TIME ZONE;

-- Rename accepted_at to accepted_on
ALTER TABLE migrate_members
  RENAME COLUMN accepted_at TO accepted_on;

-- Convert status column from old enum to new enum
-- Step 1: Add temporary column with new enum type
ALTER TABLE migrate_members ADD COLUMN status_new migrate_status;

-- Step 2: Copy data (direct cast should work since values are the same)
UPDATE migrate_members SET status_new = status::text::migrate_status;

-- Step 3: Drop old column and rename new one
ALTER TABLE migrate_members DROP COLUMN status;
ALTER TABLE migrate_members RENAME COLUMN status_new TO status;
ALTER TABLE migrate_members ALTER COLUMN status SET NOT NULL;
ALTER TABLE migrate_members ALTER COLUMN status SET DEFAULT 'pending';

-- Drop old enum type if no longer used
DROP TYPE IF EXISTS imported_member_status;
