-- ============================================================================
-- ATTENDANCE REFACTOR MIGRATION
-- 
-- This migration:
-- 1. Creates new enums for reservation status and exception initiators
-- 2. Adds denormalized fields to reservations and recurring_reservations
-- 3. Extends recurring_reservations_exceptions to support all exception types
-- 4. Adds tracking fields to check_ins
-- 5. Backfills all existing data
--
-- Run this in Supabase SQL Editor
-- Wrapped in transaction - will rollback entirely if any statement fails
-- ============================================================================

BEGIN;

-- ============================================================================
-- STEP 1: Create new enums
-- ============================================================================

DO $$ BEGIN
    CREATE TYPE reservation_status AS ENUM (
        'confirmed',
        'cancelled_by_member',
        'cancelled_by_vendor',
        'cancelled_by_holiday',
        'completed',
        'no_show'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE exception_initiator AS ENUM (
        'member',
        'vendor',
        'holiday',
        'maintenance'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- ============================================================================
-- STEP 2: Modify reservations table
-- ============================================================================

-- Add denormalized fields
ALTER TABLE reservations 
    ADD COLUMN IF NOT EXISTS program_id TEXT REFERENCES programs(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS program_name TEXT,
    ADD COLUMN IF NOT EXISTS session_time TIME,
    ADD COLUMN IF NOT EXISTS session_duration SMALLINT,
    ADD COLUMN IF NOT EXISTS session_day SMALLINT,
    ADD COLUMN IF NOT EXISTS staff_id TEXT REFERENCES staffs(id) ON DELETE SET NULL;

-- Add status tracking
ALTER TABLE reservations 
    ADD COLUMN IF NOT EXISTS status reservation_status NOT NULL DEFAULT 'confirmed',
    ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS cancelled_reason TEXT;

-- Add make-up class support
ALTER TABLE reservations 
    ADD COLUMN IF NOT EXISTS is_make_up_class BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS original_reservation_id TEXT;

-- Add updated_at column if not exists
ALTER TABLE reservations 
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ;

-- Make session_id nullable (for make-up classes without session templates)
ALTER TABLE reservations 
    ALTER COLUMN session_id DROP NOT NULL;

-- Update foreign key to SET NULL on delete (if not already)
ALTER TABLE reservations 
    DROP CONSTRAINT IF EXISTS reservations_session_id_fkey;
ALTER TABLE reservations 
    ADD CONSTRAINT reservations_session_id_fkey 
    FOREIGN KEY (session_id) REFERENCES program_sessions(id) ON DELETE SET NULL;

-- ============================================================================
-- STEP 3: Modify recurring_reservations table
-- ============================================================================

-- Add denormalized fields
ALTER TABLE recurring_reservations 
    ADD COLUMN IF NOT EXISTS program_id TEXT REFERENCES programs(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS program_name TEXT,
    ADD COLUMN IF NOT EXISTS session_time TIME,
    ADD COLUMN IF NOT EXISTS session_duration SMALLINT,
    ADD COLUMN IF NOT EXISTS session_day SMALLINT,
    ADD COLUMN IF NOT EXISTS staff_id TEXT REFERENCES staffs(id) ON DELETE SET NULL;

-- Add status tracking
ALTER TABLE recurring_reservations 
    ADD COLUMN IF NOT EXISTS status reservation_status NOT NULL DEFAULT 'confirmed';

-- Make session_id nullable
ALTER TABLE recurring_reservations 
    ALTER COLUMN session_id DROP NOT NULL;

-- Update foreign key to SET NULL on delete
ALTER TABLE recurring_reservations 
    DROP CONSTRAINT IF EXISTS recurring_reservations_session_id_fkey;
ALTER TABLE recurring_reservations 
    ADD CONSTRAINT recurring_reservations_session_id_fkey 
    FOREIGN KEY (session_id) REFERENCES program_sessions(id) ON DELETE SET NULL;

-- ============================================================================
-- STEP 4: Extend recurring_reservations_exceptions table
-- ============================================================================

-- First, drop any existing primary key or unique constraints
-- This is needed because recurring_reservation_id may be part of a primary key
ALTER TABLE recurring_reservations_exceptions 
    DROP CONSTRAINT IF EXISTS recurring_reservations_exceptions_pkey;
ALTER TABLE recurring_reservations_exceptions 
    DROP CONSTRAINT IF EXISTS unique_exception_recurring;

-- Add id column for new primary key
ALTER TABLE recurring_reservations_exceptions 
    ADD COLUMN IF NOT EXISTS id UUID DEFAULT gen_random_uuid();

-- Populate id for existing rows
UPDATE recurring_reservations_exceptions SET id = gen_random_uuid() WHERE id IS NULL;

-- Make id NOT NULL and add as primary key
ALTER TABLE recurring_reservations_exceptions ALTER COLUMN id SET NOT NULL;
ALTER TABLE recurring_reservations_exceptions ADD PRIMARY KEY (id);

-- Now we can safely make recurring_reservation_id nullable
ALTER TABLE recurring_reservations_exceptions 
    ALTER COLUMN recurring_reservation_id DROP NOT NULL;

-- Add support for single reservations
ALTER TABLE recurring_reservations_exceptions 
    ADD COLUMN IF NOT EXISTS reservation_id TEXT REFERENCES reservations(id) ON DELETE CASCADE;

-- Add location-wide and session-specific blocking
ALTER TABLE recurring_reservations_exceptions 
    ADD COLUMN IF NOT EXISTS location_id TEXT REFERENCES locations(id) ON DELETE CASCADE,
    ADD COLUMN IF NOT EXISTS session_id TEXT REFERENCES program_sessions(id) ON DELETE CASCADE;

-- Add date range support
ALTER TABLE recurring_reservations_exceptions 
    ADD COLUMN IF NOT EXISTS end_date TIMESTAMPTZ;

-- Add initiator and tracking
ALTER TABLE recurring_reservations_exceptions 
    ADD COLUMN IF NOT EXISTS initiator exception_initiator NOT NULL DEFAULT 'member',
    ADD COLUMN IF NOT EXISTS reason TEXT,
    ADD COLUMN IF NOT EXISTS created_by TEXT REFERENCES staffs(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT now();

-- Rename table to reservation_exceptions
ALTER TABLE recurring_reservations_exceptions RENAME TO reservation_exceptions;

-- ============================================================================
-- STEP 5: Modify check_ins table
-- ============================================================================

ALTER TABLE check_ins 
    ADD COLUMN IF NOT EXISTS program_id TEXT REFERENCES programs(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS program_name TEXT,
    ADD COLUMN IF NOT EXISTS recurring_id TEXT REFERENCES recurring_reservations(id) ON DELETE SET NULL;

-- ============================================================================
-- STEP 6: Backfill reservations with denormalized data
-- ============================================================================

UPDATE reservations r
SET 
    program_id = ps.program_id,
    program_name = p.name,
    session_time = ps.time,
    session_duration = ps.duration,
    session_day = ps.day,
    staff_id = COALESCE(r.staff_id, ps.staff_id)
FROM program_sessions ps
JOIN programs p ON p.id = ps.program_id
WHERE r.session_id = ps.id
  AND r.program_id IS NULL;

-- ============================================================================
-- STEP 7: Backfill recurring_reservations with denormalized data
-- ============================================================================

UPDATE recurring_reservations rr
SET 
    program_id = ps.program_id,
    program_name = p.name,
    session_time = ps.time,
    session_duration = ps.duration,
    session_day = ps.day,
    staff_id = COALESCE(rr.staff_id, ps.staff_id)
FROM program_sessions ps
JOIN programs p ON p.id = ps.program_id
WHERE rr.session_id = ps.id
  AND rr.program_id IS NULL;

-- ============================================================================
-- STEP 8: Backfill exceptions with location_id and session_id
-- ============================================================================

UPDATE reservation_exceptions e
SET 
    location_id = rr.location_id,
    session_id = rr.session_id
FROM recurring_reservations rr
WHERE e.recurring_reservation_id = rr.id
  AND e.location_id IS NULL;

-- ============================================================================
-- STEP 9: Backfill check_ins with program info
-- ============================================================================

-- From reservations
UPDATE check_ins c
SET 
    program_id = COALESCE(c.program_id, r.program_id, ps.program_id),
    program_name = COALESCE(c.program_name, r.program_name, p.name)
FROM reservations r
LEFT JOIN program_sessions ps ON r.session_id = ps.id
LEFT JOIN programs p ON ps.program_id = p.id
WHERE c.reservation_id = r.id
  AND c.program_id IS NULL;

-- From recurring_reservations
UPDATE check_ins c
SET 
    program_id = COALESCE(c.program_id, rr.program_id, ps.program_id),
    program_name = COALESCE(c.program_name, rr.program_name, p.name),
    recurring_id = c.recurring_id
FROM recurring_reservations rr
LEFT JOIN program_sessions ps ON rr.session_id = ps.id
LEFT JOIN programs p ON ps.program_id = p.id
WHERE c.recurring_id = rr.id
  AND c.program_id IS NULL;

-- ============================================================================
-- STEP 10: Create indexes for new columns
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_reservations_program_id ON reservations(program_id);
CREATE INDEX IF NOT EXISTS idx_reservations_status ON reservations(status);
CREATE INDEX IF NOT EXISTS idx_reservations_is_make_up ON reservations(is_make_up_class) WHERE is_make_up_class = true;
CREATE INDEX IF NOT EXISTS idx_recurring_reservations_program_id ON recurring_reservations(program_id);
CREATE INDEX IF NOT EXISTS idx_recurring_reservations_status ON recurring_reservations(status);
CREATE INDEX IF NOT EXISTS idx_exceptions_location_id ON reservation_exceptions(location_id);
CREATE INDEX IF NOT EXISTS idx_exceptions_initiator ON reservation_exceptions(initiator);
CREATE INDEX IF NOT EXISTS idx_exceptions_occurrence_date ON reservation_exceptions(occurrence_date);
CREATE INDEX IF NOT EXISTS idx_check_ins_program_id ON check_ins(program_id);
CREATE INDEX IF NOT EXISTS idx_check_ins_recurring_id ON check_ins(recurring_id);

-- ============================================================================
-- Commit transaction
-- ============================================================================

COMMIT;

-- ============================================================================
-- Migration Complete!
-- If you see this message, all changes were applied successfully.
-- ============================================================================

