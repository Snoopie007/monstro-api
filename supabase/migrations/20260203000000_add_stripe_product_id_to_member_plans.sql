-- ============================================================================
-- ADD STRIPE_PRODUCT_ID TO MEMBER_PLANS
-- 
-- This migration adds the stripe_product_id column to member_plans table.
-- This column stores the Stripe Product ID, which is separate from the 
-- pricing-level stripe_price_id. A Product in Stripe can have multiple Prices.
--
-- Purpose: Allow member_plans to be linked directly to Stripe Products,
-- enabling proper Stripe product/price hierarchy management.
-- ============================================================================

BEGIN;

-- ============================================================================
-- UP MIGRATION: Add stripe_product_id column
-- ============================================================================

ALTER TABLE member_plans 
ADD COLUMN IF NOT EXISTS stripe_product_id text;

COMMIT;

-- ============================================================================
-- DOWN MIGRATION (Rollback)
-- Run this to undo the migration:
--
-- ALTER TABLE member_plans DROP COLUMN IF EXISTS stripe_product_id;
-- ============================================================================
