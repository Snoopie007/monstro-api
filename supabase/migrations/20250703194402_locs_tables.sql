CREATE TYPE location_status AS ENUM('incomplete', 'active', 'past_due', 'canceled', 'paused', 'trialing', 'unpaid', 'incomplete_expired');
-- Tables with dependencies on vendors
CREATE TABLE IF NOT EXISTS locations (
  id text PRIMARY KEY NOT NULL DEFAULT uuid_base62('acc_'),
  name text UNIQUE NOT NULL,
  address text,
  about text,
  city text,
  state text,
  logo_url text,
  country text,
  postal_code text,
  website text,
  email text,
  phone text,
  timezone text NOT NULL DEFAULT 'America/New_York',
  vendor_id text REFERENCES vendors (id) ON DELETE CASCADE NOT NULL,
  slug text UNIQUE NOT NULL,
  metadata jsonb DEFAULT '{}'::jsonb,
  industry text,
  legal_name text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone
);

CREATE INDEX IF NOT EXISTS idx_locations_vendor_id ON locations (vendor_id);



CREATE TABLE IF NOT EXISTS location_state (
  location_id text PRIMARY KEY REFERENCES locations (id) ON DELETE CASCADE NOT NULL,
  plan_id bigint,
  pkg_id bigint,
  payment_plan_id bigint,
  status location_status NOT NULL DEFAULT 'incomplete',
  agree_to_terms boolean NOT NULL DEFAULT false,
  last_renewal_date timestamp with time zone DEFAULT now(),
  start_date timestamp with time zone,
  stripe_subscription_id text,
  settings jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone,
  usage_percent integer NOT NULL DEFAULT 0,
  tax_rate integer NOT NULL DEFAULT 0,
  CONSTRAINT location_state_location_id_key UNIQUE (location_id)
);

-- Tables with dependencies on members and locations
CREATE TABLE IF NOT EXISTS member_locations (
  location_id text REFERENCES locations (id) ON DELETE CASCADE NOT NULL,
  member_id text REFERENCES members (id) ON DELETE CASCADE NOT NULL,
  points integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone,
  status location_status NOT NULL DEFAULT 'incomplete',
  profile jsonb,
  onboarded boolean NOT NULL DEFAULT false,
  CONSTRAINT member_locations_pkey PRIMARY KEY (location_id, member_id),
  CONSTRAINT member_locations_unique UNIQUE (location_id, member_id)
);

CREATE INDEX IF NOT EXISTS idx_member_locations_location_member ON member_locations (location_id, member_id);


-- Tables with dependencies on staffs and locations
CREATE TABLE IF NOT EXISTS staff_locations (
  id text PRIMARY KEY NOT NULL DEFAULT uuid_base62(),
  staff_id text REFERENCES staffs (id) ON DELETE CASCADE NOT NULL,
  location_id text REFERENCES locations (id) ON DELETE CASCADE NOT NULL,
  status staff_status NOT NULL DEFAULT 'active',
  CONSTRAINT staff_locations_staff_location_unique UNIQUE (staff_id, location_id)
);

CREATE INDEX IF NOT EXISTS idx_staff_locations_staff_id ON staff_locations (staff_id);
CREATE INDEX IF NOT EXISTS idx_staff_locations_location_id ON staff_locations (location_id);
