-- Tables with dependencies on vendors and locations
CREATE TABLE IF NOT EXISTS tax_rates (
  id text PRIMARY KEY NOT NULL DEFAULT uuid_base62(),
  name text NOT NULL,
  percentage integer NOT NULL,
  country text NOT NULL,
  state text NOT NULL DEFAULT 'inactive',
  inclusive boolean NOT NULL DEFAULT false,
  stripe_rate_id text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone,
  location_id text REFERENCES locations (id) ON DELETE CASCADE,
  CONSTRAINT tax_rates_location_id_foreign FOREIGN KEY (location_id) REFERENCES locations (id) ON DELETE CASCADE
);
