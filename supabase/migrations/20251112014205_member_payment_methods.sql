-- Tables with dependencies on vendors and locations
CREATE TABLE IF NOT EXISTS member_payment_methods (
  member_id text REFERENCES  members (id) ON DELETE CASCADE NOT NULL,
  location_id text REFERENCES locations (id) ON DELETE CASCADE NOT NULL,
  type text NOT NULL,
  stripe_id text NOT NULL,
  fingerprint text NOT NULL UNIQUE,
  is_default boolean NOT NULL DEFAULT FALSE,
  card jsonb,
  us_bank_account jsonb,
  last4 text NOT NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone,
  CONSTRAINT member_payment_methods_member_id_foreign FOREIGN KEY (member_id) REFERENCES members (id) ON DELETE CASCADE,
  CONSTRAINT member_payment_methods_location_id_foreign FOREIGN KEY (location_id) REFERENCES locations (id) ON DELETE CASCADE
);
