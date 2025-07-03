
CREATE TYPE staff_status AS ENUM('active', 'inactive');
-- Base tables with no foreign key dependencies
CREATE TABLE IF NOT EXISTS users (
  id text PRIMARY KEY NOT NULL DEFAULT uuid_base62('usr_'),
  name text NOT NULL,
  email text NOT NULL UNIQUE,
  email_verified_at timestamp with time zone,
  image text,
  password text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS sessions (
  id text PRIMARY KEY NOT NULL DEFAULT uuid_base62('ses_'),
  session_token text NOT NULL,
  user_id text REFERENCES users (id) ON DELETE CASCADE NOT NULL,
  expires timestamp with time zone NOT NULL,
  ip_address text,
  browser_id text,
  mac_address text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone
);

CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions (user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_session_token ON sessions (session_token);

CREATE TABLE IF NOT EXISTS account (
  user_id text REFERENCES users (id) ON DELETE CASCADE NOT NULL,
  type text,
  provider text NOT NULL,
  provider_account_id text NOT NULL,
  refresh_token text,
  access_token text,
  expires_at bigint,
  token_type text,
  scope text,
  id_token text,
  session_state text,
  CONSTRAINT account_pkey PRIMARY KEY (provider, provider_account_id)
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users (email);
-- Tables with dependencies on users
CREATE TABLE IF NOT EXISTS vendors (
  id text PRIMARY KEY NOT NULL DEFAULT uuid_base62('vdr_'),
  first_name text NOT NULL,
  last_name text,
  user_id text REFERENCES users (id) ON DELETE CASCADE NOT NULL,
  stripe_customer_id text,
  email text UNIQUE NOT NULL,
  avatar text,
  phone text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone
);


CREATE INDEX IF NOT EXISTS idx_vendors_email ON vendors (email);
CREATE INDEX IF NOT EXISTS idx_vendors_user_id ON vendors (user_id);

CREATE TABLE IF NOT EXISTS members (
  id text PRIMARY KEY NOT NULL DEFAULT uuid_base62('mbr_'),
  user_id text REFERENCES users (id) ON DELETE CASCADE NOT NULL,
  email text NOT NULL,
  phone text,
  referral_code text UNIQUE,
  avatar text,
  stripe_customer_id text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone,
  first_name text,
  last_name text,
  gender text,
  dob timestamp with time zone
);

CREATE INDEX IF NOT EXISTS idx_members_email ON members (email);
CREATE INDEX IF NOT EXISTS idx_members_user_id ON members (user_id);

-- Tables with dependencies on roles, users, and locations
CREATE TABLE IF NOT EXISTS staffs (
  id text PRIMARY KEY NOT NULL DEFAULT uuid_base62('stf_'),
  first_name text NOT NULL,
  last_name text NOT NULL,
  email text NOT NULL,
  phone text NOT NULL,
  avatar text,
  user_id text REFERENCES users (id) ON DELETE CASCADE NOT NULL,
  role_id text REFERENCES roles (id) ON DELETE SET NULL,
  location_id text REFERENCES locations (id) ON DELETE CASCADE,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone
);