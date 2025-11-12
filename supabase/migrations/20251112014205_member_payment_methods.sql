-- Tables with dependencies on vendors and locations
CREATE TABLE IF NOT EXISTS payment_methods (
  id text PRIMARY KEY NOT NULL DEFAULT uuid_base62(),
  type text NOT NULL,
  stripe_id text NOT NULL UNIQUE,
  fingerprint text NOT NULL UNIQUE,
  card jsonb,
  us_bank_account jsonb,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone
);


CREATE TABLE IF NOT EXISTS member_payment_methods (
  location_id text REFERENCES locations (id) ON DELETE CASCADE NOT NULL,
  member_id text REFERENCES members (id) ON DELETE CASCADE NOT NULL,
  payment_method_id text REFERENCES payment_methods (id) ON DELETE CASCADE NOT NULL,
  is_default boolean NOT NULL DEFAULT FALSE,
  PRIMARY KEY (location_id, member_id, payment_method_id)
);