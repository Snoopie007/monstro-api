-- ============================================================================
-- MEMBER PLAN PRICING MIGRATION
-- 
-- This migration:
-- 1. Creates member_plan_pricing table for flexible pricing tiers
-- 2. Adds member_plan_pricing_id to member_subscriptions and member_packages
-- 3. Migrates existing pricing data from member_plans to member_plan_pricing
-- 4. Drops old pricing columns from member_plans
-- 5. Updates check_ins constraints for program tracking
-- ============================================================================

BEGIN;

-- ============================================================================
-- STEP 1: Create member_plan_pricing table
-- ============================================================================

CREATE TABLE IF NOT EXISTS member_plan_pricing (
  id text PRIMARY KEY NOT NULL DEFAULT uuid_base62(),
  member_plan_id text REFERENCES member_plans (id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  price integer NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'USD',
  -- Billing Cycle: how often they're charged (for recurring plans)
  interval interval_type DEFAULT 'month',
  interval_threshold integer DEFAULT 1,
  -- Term/Expiration: how long until auto-cancel (null = ongoing/never expires)
  expire_interval interval_type,
  expire_threshold integer,
  stripe_price_id text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone
);

-- Create indexes for member_plan_pricing
CREATE INDEX IF NOT EXISTS idx_member_plan_pricing_plan_id ON member_plan_pricing (member_plan_id);

-- ============================================================================
-- STEP 2: Add new columns to member_subscriptions
-- ============================================================================

ALTER TABLE member_subscriptions 
ADD COLUMN IF NOT EXISTS member_plan_pricing_id text REFERENCES member_plan_pricing (id) ON DELETE SET NULL;

ALTER TABLE member_subscriptions 
ADD COLUMN IF NOT EXISTS expires_at timestamp with time zone;

-- ============================================================================
-- STEP 3: Add new column to member_packages
-- ============================================================================

ALTER TABLE member_packages 
ADD COLUMN IF NOT EXISTS member_plan_pricing_id text REFERENCES member_plan_pricing (id) ON DELETE SET NULL;

-- ============================================================================
-- STEP 4: Migrate existing pricing data from member_plans to member_plan_pricing
-- Create a "Standard" pricing record for each existing plan
-- ============================================================================

INSERT INTO member_plan_pricing (
  member_plan_id,
  name,
  price,
  currency,
  interval,
  interval_threshold,
  expire_interval,
  expire_threshold,
  stripe_price_id,
  created_at
)
SELECT 
  id as member_plan_id,
  'Standard' as name,
  COALESCE(price, 0) as price,
  COALESCE(currency, 'USD') as currency,
  COALESCE(interval, 'month') as interval,
  COALESCE(interval_threshold, 1) as interval_threshold,
  expire_interval,
  expire_threshold,
  stripe_price_id,
  created_at
FROM member_plans
WHERE NOT EXISTS (
  SELECT 1 FROM member_plan_pricing WHERE member_plan_pricing.member_plan_id = member_plans.id
);

-- ============================================================================
-- STEP 5: Update existing subscriptions to reference the migrated pricing
-- ============================================================================

UPDATE member_subscriptions 
SET member_plan_pricing_id = (
  SELECT mpp.id 
  FROM member_plan_pricing mpp 
  WHERE mpp.member_plan_id = member_subscriptions.member_plan_id 
  LIMIT 1
)
WHERE member_plan_pricing_id IS NULL;

-- ============================================================================
-- STEP 6: Update existing packages to reference the migrated pricing
-- ============================================================================

UPDATE member_packages 
SET member_plan_pricing_id = (
  SELECT mpp.id 
  FROM member_plan_pricing mpp 
  WHERE mpp.member_plan_id = member_packages.member_plan_id 
  LIMIT 1
)
WHERE member_plan_pricing_id IS NULL;

-- ============================================================================
-- STEP 7: Drop old pricing columns from member_plans
-- Note: We're dropping these columns since pricing is now in member_plan_pricing
-- ============================================================================

ALTER TABLE member_plans DROP COLUMN IF EXISTS price;
ALTER TABLE member_plans DROP COLUMN IF EXISTS interval;
ALTER TABLE member_plans DROP COLUMN IF EXISTS interval_threshold;
ALTER TABLE member_plans DROP COLUMN IF EXISTS stripe_price_id;
ALTER TABLE member_plans DROP COLUMN IF EXISTS expire_interval;
ALTER TABLE member_plans DROP COLUMN IF EXISTS expire_threshold;

-- ============================================================================
-- STEP 8: Add program columns to check_ins
-- ============================================================================

ALTER TABLE check_ins 
ADD COLUMN IF NOT EXISTS program_id text,
ADD COLUMN IF NOT EXISTS program_name text;

-- ============================================================================
-- STEP 9: Update check_ins FK constraints
-- ============================================================================

ALTER TABLE check_ins 
DROP CONSTRAINT IF EXISTS check_ins_reservation_id_fkey;

ALTER TABLE check_ins 
DROP CONSTRAINT IF EXISTS check_ins_recurring_id_fkey;

ALTER TABLE check_ins 
ADD CONSTRAINT check_ins_program_id_fkey 
FOREIGN KEY (program_id) REFERENCES programs(id) ON DELETE SET NULL;

ALTER TABLE check_ins 
ADD CONSTRAINT check_ins_reservation_id_fkey 
FOREIGN KEY (reservation_id) REFERENCES reservations(id) ON DELETE SET NULL;

ALTER TABLE check_ins 
ADD CONSTRAINT check_ins_recurring_id_fkey 
FOREIGN KEY (recurring_id) REFERENCES recurring_reservations(id) ON DELETE SET NULL;

-- Make reservation_id nullable for walk-in check-ins
ALTER TABLE check_ins ALTER COLUMN reservation_id DROP NOT NULL;

COMMIT;

-- ============================================================================
-- Migration Complete!
-- ============================================================================

