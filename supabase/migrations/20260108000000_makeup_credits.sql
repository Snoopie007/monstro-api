-- ============================================================================
-- MAKE-UP CREDITS MIGRATION
-- 
-- This migration adds make-up credit tracking to plans and member subscriptions/packages:
-- 1. member_plans.make_up_credits - defines how many credits are included with the plan
-- 2. member_subscriptions.make_up_credits - tracks how many credits have been used
-- 3. member_subscriptions.allow_make_up_carry_over - whether unused credits carry to next period
-- 4. member_packages.make_up_credits - tracks how many credits have been used
-- 5. member_packages.allow_make_up_carry_over - whether unused credits carry over
-- ============================================================================

BEGIN;

-- Add make-up credits to member_plans (defines allowance per plan)
ALTER TABLE member_plans 
    ADD COLUMN IF NOT EXISTS make_up_credits INTEGER DEFAULT 0;

-- Add make-up credits tracking to member_subscriptions
ALTER TABLE member_subscriptions 
    ADD COLUMN IF NOT EXISTS make_up_credits INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS allow_make_up_carry_over BOOLEAN NOT NULL DEFAULT false;

-- Add make-up credits tracking to member_packages
ALTER TABLE member_packages 
    ADD COLUMN IF NOT EXISTS make_up_credits INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS allow_make_up_carry_over BOOLEAN NOT NULL DEFAULT false;

-- Create index for efficient querying of members with available credits
CREATE INDEX IF NOT EXISTS idx_member_subscriptions_makeup_credits 
    ON member_subscriptions(make_up_credits);
CREATE INDEX IF NOT EXISTS idx_member_packages_makeup_credits 
    ON member_packages(make_up_credits);

COMMIT;

