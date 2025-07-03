

CREATE TABLE IF NOT EXISTS wallets (
  id text PRIMARY KEY NOT NULL DEFAULT uuid_base62(),
  location_id text UNIQUE REFERENCES locations (id) ON DELETE CASCADE NOT NULL,
  balance bigint NOT NULL DEFAULT 0,
  credits bigint NOT NULL DEFAULT 0,
  recharge_amount bigint NOT NULL DEFAULT 2500,
  recharge_threshold bigint NOT NULL DEFAULT 1000,
  last_charged timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone
);

-- Tables with dependencies on wallet
CREATE TABLE IF NOT EXISTS wallet_usages (
  id text PRIMARY KEY NOT NULL DEFAULT uuid_base62('wlt_'),
  wallet_id text REFERENCES wallets (id) ON DELETE CASCADE NOT NULL,
  is_credit boolean NOT NULL DEFAULT false,
  description text NOT NULL,
  amount integer NOT NULL DEFAULT 0,
  balance integer NOT NULL DEFAULT 0,
  activity_date timestamp with time zone,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);