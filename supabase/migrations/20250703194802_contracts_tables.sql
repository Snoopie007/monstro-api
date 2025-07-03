
CREATE TYPE contract_type AS ENUM('contract', 'waiver');
-- Tables with dependencies on locations
CREATE TABLE IF NOT EXISTS contracts (
  id text PRIMARY KEY NOT NULL DEFAULT uuid_base62(),
  content text,
  title text NOT NULL,
  description text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone,
  is_draft boolean NOT NULL DEFAULT false,
  editable boolean NOT NULL DEFAULT true,
  location_id text REFERENCES locations (id) ON DELETE CASCADE NOT NULL,
  type contract_type NOT NULL DEFAULT 'contract'::contract_type,
  require_signature boolean NOT NULL DEFAULT false
);

ALTER TABLE location_state ADD COLUMN waiver_id text REFERENCES contracts (id) ON DELETE SET NULL;

-- Tables with dependencies on members and contracts
CREATE TABLE IF NOT EXISTS member_contracts (
  id text PRIMARY KEY NOT NULL DEFAULT uuid_base62(),
  member_id text REFERENCES members (id) ON DELETE CASCADE NOT NULL,
  contract_id text REFERENCES contracts (id) ON DELETE CASCADE NOT NULL,
  location_id text REFERENCES locations (id) ON DELETE CASCADE NOT NULL,
  signed boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone,
  variables jsonb NOT NULL DEFAULT '{}'::jsonb,
  signature text,
  CONSTRAINT member_contracts_unique UNIQUE (member_id, contract_id)
);

CREATE INDEX IF NOT EXISTS idx_member_contracts_member_id ON member_contracts (member_id);

ALTER TABLE member_locations ADD COLUMN waiver_id text REFERENCES member_contracts (id) ON DELETE SET NULL;
