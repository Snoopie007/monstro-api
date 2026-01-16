-- Migration: Update import_members to reference pricing_id instead of plan_id
-- Following the same pattern as the member_subscriptions and member_packages migration

BEGIN;

-- Step 1: Add the new pricing_id column
ALTER TABLE import_members
ADD COLUMN IF NOT EXISTS pricing_id text REFERENCES member_plan_pricing (id) ON DELETE SET NULL;

-- Step 2: Add the new plan_type column
ALTER TABLE import_members
ADD COLUMN IF NOT EXISTS plan_type plan_type;

-- Step 3: Backfill existing data - map plan_id to pricing_id
-- Each member_plan should have at least one member_plan_pricing record (created as "Standard" in previous migration)
UPDATE import_members
SET pricing_id = (
  SELECT mpp.id
  FROM member_plan_pricing mpp
  WHERE mpp.member_plan_id = import_members.plan_id
  LIMIT 1
)
WHERE plan_id IS NOT NULL
  AND pricing_id IS NULL;

-- Step 4: Drop the old plan_id foreign key constraint
ALTER TABLE import_members
DROP CONSTRAINT IF EXISTS import_members_plan_id_fkey;

-- Step 5: Drop the old plan_id column
ALTER TABLE import_members
DROP COLUMN IF EXISTS plan_id;

-- Step 6: Create index for the new column for query performance
CREATE INDEX IF NOT EXISTS idx_import_members_pricing_id
ON import_members(pricing_id);

COMMIT;
