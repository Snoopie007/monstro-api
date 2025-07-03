
CREATE TABLE IF NOT EXISTS support_plans (
    id text PRIMARY KEY NOT NULL DEFAULT uuid_base62(),
    vendor_id text REFERENCES vendors (id) ON DELETE CASCADE NOT NULL,
    name text NOT NULL,
    price integer NOT NULL,
    support_calls boolean NOT NULL DEFAULT false,
    sessions_per_month integer NOT NULL DEFAULT 0,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone
);
