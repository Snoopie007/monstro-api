
CREATE TABLE IF NOT EXISTS integrations (
  id text PRIMARY KEY NOT NULL DEFAULT uuid_base62(),
  service text NOT NULL,
  api_key text,
  secret_key text,
  access_token text,
  refresh_token text,
  expires_at bigint,
  account_id text NOT NULL,
  settings jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone,
  location_id text NOT NULL,
  CONSTRAINT unique_service_location UNIQUE (service, location_id),
  CONSTRAINT integrations_location_id_foreign FOREIGN KEY (location_id) REFERENCES locations (id) ON DELETE CASCADE
);