-- Add metadata column to import_members table for storing custom field values
ALTER TABLE import_members
ADD COLUMN metadata jsonb DEFAULT '{}'::jsonb;
