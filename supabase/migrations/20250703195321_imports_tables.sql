
CREATE TYPE import_status AS ENUM('pending', 'processing', 'completed', 'failed');

CREATE TABLE IF NOT EXISTS import_members (
  id text PRIMARY KEY NOT NULL DEFAULT uuid_base62(),
  first_name text NOT NULL,
  last_name text NOT NULL,
  member_id text REFERENCES members (id) ON DELETE SET NULL,
  email text NOT NULL,
  phone text NOT NULL,
  accepted_at timestamp with time zone,
  last_renewal_day timestamp with time zone NOT NULL,
  status import_status NOT NULL DEFAULT 'pending',
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone,
  plan_id text REFERENCES member_plans (id) ON DELETE SET NULL,
  oauth boolean NOT NULL DEFAULT false,
  location_id text REFERENCES locations (id) ON DELETE CASCADE NOT NULL
);


