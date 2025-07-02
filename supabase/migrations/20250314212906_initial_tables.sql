CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE SCHEMA IF NOT EXISTS private;

-- UUID to Base62 conversion function
CREATE OR REPLACE FUNCTION uuid_base62(prefix text DEFAULT '') RETURNS text AS $$
DECLARE
    raw UUID := uuid_generate_v4();
    b64 text;
BEGIN
    b64 := encode(uuid_send(raw), 'base64');
    b64 := regexp_replace(b64, '[^a-zA-Z0-9]', '', 'g');
    RETURN prefix || b64;
END;
$$ LANGUAGE plpgsql;


-- Create ENUM types
CREATE TYPE contract_type AS ENUM('contract', 'waiver');
CREATE TYPE invoice_status AS ENUM('draft', 'paid', 'unpaid', 'uncollectible', 'void');
CREATE TYPE location_status AS ENUM('incomplete', 'active', 'past_due', 'canceled', 'paused', 'trialing', 'unpaid', 'incomplete_expired');
CREATE TYPE relationship AS ENUM('parent', 'spouse', 'child', 'sibling', 'other');
CREATE TYPE package_status AS ENUM('active', 'incomplete', 'expired', 'completed');
CREATE TYPE payment_method AS ENUM('card', 'cash', 'check', 'zelle', 'venmo', 'paypal', 'apple', 'google');
CREATE TYPE plan_interval AS ENUM('day', 'week', 'month', 'year');
CREATE TYPE plan_type AS ENUM('recurring', 'one-time');
CREATE TYPE role_color AS ENUM('red', 'green', 'blue', 'pink', 'cyan', 'lime', 'orange', 'fuchsia', 'sky', 'lemon', 'purple', 'yellow');
CREATE TYPE transaction_status AS ENUM('paid', 'failed', 'incomplete');
CREATE TYPE staff_status AS ENUM('active', 'inactive');
CREATE TYPE program_status AS ENUM('active', 'inactive');
CREATE TYPE import_status AS ENUM('pending', 'processing', 'completed', 'failed');
CREATE TYPE transaction_type AS ENUM('inbound', 'outbound');

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
  waiver_id text REFERENCES contracts (id) ON DELETE SET NULL,
  tax_rate integer NOT NULL DEFAULT 0,
  CONSTRAINT location_state_location_id_key UNIQUE (location_id)
);


CREATE TABLE IF NOT EXISTS roles (
  id text PRIMARY KEY NOT NULL DEFAULT uuid_base62(),
  name text NOT NULL,
  guard_name text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone,
  location_id text REFERENCES locations (id) ON DELETE CASCADE,
  color role_color,
  CONSTRAINT roles_name_guard_name_unique UNIQUE (name, guard_name)
);


CREATE TABLE IF NOT EXISTS permissions (
  id text PRIMARY KEY NOT NULL DEFAULT uuid_base62(),
  name text NOT NULL,
  guard_name text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone,
  description text,
  CONSTRAINT permissions_name_guard_name_unique UNIQUE (name, guard_name)
);

-- Tables with dependencies on roles
CREATE TABLE IF NOT EXISTS role_has_permissions (
  permission_id text REFERENCES permissions (id) ON DELETE CASCADE NOT NULL,
  role_id text REFERENCES roles (id) ON DELETE CASCADE NOT NULL,
  CONSTRAINT role_has_permissions_pkey PRIMARY KEY (permission_id, role_id)
);

CREATE TABLE IF NOT EXISTS user_roles (
  user_id text REFERENCES users (id) ON DELETE CASCADE NOT NULL,
  role_id text REFERENCES roles (id) ON DELETE CASCADE NOT NULL,
  CONSTRAINT user_roles_pkey PRIMARY KEY (user_id, role_id)
);

CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON user_roles (user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role_id ON user_roles (role_id);


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

CREATE TABLE IF NOT EXISTS programs (
  id text PRIMARY KEY NOT NULL DEFAULT uuid_base62(),
  location_id text REFERENCES locations (id) ON DELETE CASCADE NOT NULL,
  instructor_id text REFERENCES staffs (id) ON DELETE SET NULL,
  name text NOT NULL,
  description text NOT NULL,
  icon text,
  capacity integer NOT NULL,
  min_age integer NOT NULL,
  max_age integer NOT NULL,
  status program_status NOT NULL DEFAULT 'active',
  interval plan_interval NOT NULL DEFAULT 'week',
  interval_threshold smallint NOT NULL DEFAULT 1,
  cancelation_threshold integer NOT NULL DEFAULT 24,
  allow_waitlist boolean NOT NULL DEFAULT false,
  waitlist_capacity integer NOT NULL DEFAULT 0,
  allow_make_up_class boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone
);

CREATE INDEX IF NOT EXISTS idx_programs_location_id ON programs (location_id);

CREATE TABLE IF NOT EXISTS program_tags (
  id text PRIMARY KEY NOT NULL DEFAULT uuid_base62(),
  name text NOT NULL,
  CONSTRAINT program_tags_name_unique UNIQUE (name)
);

CREATE TABLE IF NOT EXISTS program_has_tags (
  program_id text REFERENCES programs (id) ON DELETE CASCADE NOT NULL,
  tag_id text REFERENCES program_tags (id) ON DELETE CASCADE NOT NULL,
  CONSTRAINT program_has_tags_pkey PRIMARY KEY (program_id, tag_id)
);

CREATE TABLE IF NOT EXISTS program_sessions (
  id text PRIMARY KEY NOT NULL DEFAULT uuid_base62('pss_'),
  program_id text REFERENCES programs (id) ON DELETE CASCADE NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone,
  time time NOT NULL,
  duration smallint NOT NULL DEFAULT 0,
  day smallint NOT NULL DEFAULT 1 CHECK (day BETWEEN 1 AND 7),
  CONSTRAINT unique_program_session UNIQUE (program_id, day, time, duration)
);

CREATE INDEX IF NOT EXISTS idx_program_sessions_program_id ON program_sessions (program_id);


CREATE TABLE IF NOT EXISTS session_waitlist (
    session_id text REFERENCES program_sessions (id) ON DELETE CASCADE NOT NULL,
    member_id text REFERENCES members (id) ON DELETE CASCADE NOT NULL,
    session_date timestamp with time zone NOT NULL,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone,
    CONSTRAINT session_waitlist_unique UNIQUE (session_id, member_id)
);

CREATE INDEX IF NOT EXISTS idx_session_waitlist_session_id ON session_waitlist (session_id);
CREATE INDEX IF NOT EXISTS idx_session_waitlist_member_id ON session_waitlist (member_id);

-- Tables with dependencies on members and contracts
CREATE TABLE IF NOT EXISTS member_contracts (
  id text PRIMARY KEY NOT NULL DEFAULT uuid_base62(),
  member_id text REFERENCES members (id) ON DELETE CASCADE NOT NULL,
  contract_id text REFERENCES contracts (id) ON DELETE CASCADE NOT NULL,
  signed boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone,
  variables jsonb NOT NULL DEFAULT '{}'::jsonb,
  signature text,
  CONSTRAINT member_contracts_unique UNIQUE (member_id, contract_id)
);

CREATE INDEX IF NOT EXISTS idx_member_contracts_member_id ON member_contracts (member_id);
-- Tables with dependencies on members and locations
CREATE TABLE IF NOT EXISTS member_locations (
  location_id text REFERENCES locations (id) ON DELETE CASCADE NOT NULL,
  member_id text REFERENCES members (id) ON DELETE CASCADE NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone,
  status location_status NOT NULL DEFAULT 'incomplete',
  invite_date timestamp with time zone,
  invite_accepted_date timestamp with time zone,
  waiver_id text REFERENCES member_contracts (id) ON DELETE SET NULL,
  CONSTRAINT member_locations_pkey PRIMARY KEY (location_id, member_id),
  CONSTRAINT member_locations_unique UNIQUE (location_id, member_id)
);

CREATE INDEX IF NOT EXISTS idx_member_locations_location_member ON member_locations (location_id, member_id);

CREATE TABLE IF NOT EXISTS family_members (
  id text PRIMARY KEY NOT NULL DEFAULT uuid_base62(),
  member_id text REFERENCES members (id) ON DELETE CASCADE NOT NULL,
  related_member_id text REFERENCES members (id) ON DELETE CASCADE NOT NULL,
  relationship relationship NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone,
);

CREATE INDEX IF NOT EXISTS idx_family_members_member_id ON family_members (member_id);
CREATE INDEX IF NOT EXISTS idx_family_members_related_member_id ON family_members (related_member_id);

-- Tables with dependencies on programs
CREATE TABLE IF NOT EXISTS member_plans (
  id text PRIMARY KEY NOT NULL DEFAULT uuid_base62(),
  name character varying(255) NOT NULL,
  description character varying(255) NOT NULL,
  location_id text REFERENCES locations (id) ON DELETE CASCADE NOT NULL,
  family boolean NOT NULL DEFAULT false,
  family_member_limit integer NOT NULL DEFAULT 0,
  contract_id text REFERENCES contracts (id) ON DELETE SET NULL,
  type plan_type NOT NULL DEFAULT 'recurring',
  interval plan_interval NOT NULL DEFAULT 'month',
  interval_threshold smallint NOT NULL DEFAULT 1,
  currency text NOT NULL DEFAULT 'USD',
  price bigint,
  editable boolean NOT NULL DEFAULT true,
  stripe_price_id text,
  total_class_limit integer,
  class_limit_interval plan_interval,
  billing_anchor_config jsonb,
  marketing_details jsonb NOT NULL DEFAULT '{}'::jsonb,
  allow_proration boolean NOT NULL DEFAULT false,
  archived boolean NOT NULL DEFAULT false,
  class_limit_threshold smallint,
  expire_interval plan_interval,
  expire_threshold smallint,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone
);


-- Tables with dependencies on members, member_plans, and program_levels
CREATE TABLE IF NOT EXISTS member_subscriptions (
  id text PRIMARY KEY NOT NULL DEFAULT uuid_base62('sub_'),
  parent_id text REFERENCES member_subscriptions (id) ON DELETE SET NULL,
  member_id text REFERENCES members (id) ON DELETE CASCADE NOT NULL,
  member_plan_id text REFERENCES member_plans (id) ON DELETE CASCADE NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone,
  stripe_subscription_id text,
  status location_status NOT NULL DEFAULT 'incomplete',
  current_period_start timestamp with time zone,
  start_date timestamp with time zone NOT NULL,
  current_period_end timestamp with time zone,
  cancel_at timestamp with time zone,
  cancel_at_period_end boolean NOT NULL DEFAULT false,
  location_id text REFERENCES locations (id) ON DELETE CASCADE,
  trial_end timestamp with time zone,
  ended_at timestamp with time zone,
  payment_method payment_method NOT NULL DEFAULT 'cash',
  metadata jsonb NOT NULL DEFAULT '{}',
  member_contract_id text REFERENCES member_contracts (id) ON DELETE CASCADE,
  is_participant boolean NOT NULL DEFAULT true
);

CREATE INDEX IF NOT EXISTS idx_member_subscriptions_member_id ON member_subscriptions (member_id);
CREATE INDEX IF NOT EXISTS idx_member_subscriptions_location_id ON member_subscriptions (location_id);
CREATE INDEX IF NOT EXISTS idx_member_subscriptions_status ON member_subscriptions (status);

-- Tables with dependencies on members, member_plans, and program_levels
CREATE TABLE IF NOT EXISTS member_packages (
  id text PRIMARY KEY NOT NULL DEFAULT uuid_base62('pkg_'),
  member_plan_id text REFERENCES member_plans (id) ON DELETE CASCADE NOT NULL,
  member_id text REFERENCES members (id) ON DELETE CASCADE NOT NULL,
  stripe_payment_id text,
  parent_id text REFERENCES member_packages (id) ON DELETE SET NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone,
  status package_status NOT NULL DEFAULT 'incomplete',
  start_date timestamp with time zone NOT NULL,
  payment_method payment_method NOT NULL DEFAULT 'cash',
  metadata jsonb DEFAULT '{}'::jsonb,
  total_class_attended integer NOT NULL DEFAULT 0,
  total_class_limit integer NOT NULL DEFAULT 0,
  expire_date timestamp with time zone,
  location_id text REFERENCES locations (id) ON DELETE CASCADE NOT NULL,
  member_contract_id text REFERENCES member_contracts (id) ON DELETE CASCADE,
  is_participant boolean NOT NULL DEFAULT true
);

CREATE INDEX IF NOT EXISTS idx_member_packages_member_id ON member_packages (member_id);
CREATE INDEX IF NOT EXISTS idx_member_packages_location_id ON member_packages (location_id);
CREATE INDEX IF NOT EXISTS idx_member_packages_status ON member_packages (status);

-- Tables with dependencies on members, locations, and member_subscriptions/packages
CREATE TABLE IF NOT EXISTS member_invoices (
  id text PRIMARY KEY NOT NULL DEFAULT uuid_base62('inv_'),
  currency text,
  member_id text REFERENCES members (id) ON DELETE CASCADE NOT NULL,
  location_id text REFERENCES locations (id) ON DELETE CASCADE NOT NULL,
  description text,
  items jsonb[] DEFAULT '{}'::jsonb[],
  paid boolean NOT NULL DEFAULT false,
  tax integer NOT NULL CHECK (tax >= 0),
  total bigint NOT NULL CHECK (total >= 0),
  discount bigint NOT NULL CHECK (discount >= 0),
  subtotal bigint NOT NULL CHECK (subtotal >= 0),
  due_date timestamp with time zone NOT NULL DEFAULT now(),
  attempt_count integer NOT NULL DEFAULT 0,
  invoice_pdf text,
  status invoice_status NOT NULL DEFAULT 'draft',
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  member_subscription_id text REFERENCES member_subscriptions (id) ON DELETE CASCADE,
  member_package_id text REFERENCES member_packages (id) ON DELETE CASCADE,
  for_period_start timestamp with time zone,
  for_period_end timestamp with time zone
);

CREATE INDEX IF NOT EXISTS idx_member_invoices_member_id ON member_invoices (member_id);
CREATE INDEX IF NOT EXISTS idx_member_invoices_location_id ON member_invoices (location_id);
CREATE INDEX IF NOT EXISTS idx_member_invoices_status ON member_invoices (status);


CREATE TABLE IF NOT EXISTS transactions (
  id text PRIMARY KEY NOT NULL DEFAULT uuid_base62('txn_'),
  description text,
  type transaction_type NOT NULL,
  amount integer NOT NULL,
  tax_amount integer NOT NULL DEFAULT 0,
  status transaction_status NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone,
  location_id text REFERENCES locations (id) ON DELETE CASCADE NOT NULL,
  member_id text REFERENCES members (id) ON DELETE CASCADE,
  payment_method payment_method NOT NULL,
  items jsonb[] DEFAULT '{}'::jsonb[],
  charge_date timestamp with time zone DEFAULT now(),
  currency text NOT NULL DEFAULT 'USD',
  metadata jsonb NOT NULL DEFAULT '{}',
  refunded boolean NOT NULL DEFAULT false,
  invoice_id text REFERENCES member_invoices (id) ON DELETE CASCADE,
  subscription_id text REFERENCES member_subscriptions (id) ON DELETE CASCADE,
  package_id text REFERENCES member_packages (id) ON DELETE CASCADE
);


CREATE TABLE IF NOT EXISTS reservations (
  id text PRIMARY KEY NOT NULL DEFAULT uuid_base62('rsv_'),
  session_id text REFERENCES sessions (id) ON DELETE CASCADE NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  start_on timestamp with time zone NOT NULL,
  end_on timestamp with time zone NOT NULL,
  location_id text REFERENCES locations (id) ON DELETE CASCADE NOT NULL, 
  member_subscription_id text REFERENCES member_subscriptions (id) ON DELETE CASCADE,
  member_package_id text REFERENCES member_packages (id) ON DELETE CASCADE,
  member_id text REFERENCES members (id) ON DELETE CASCADE NOT NULL,
  CONSTRAINT session_subscription_unique UNIQUE (start_on, member_id, session_id, member_subscription_id),
  CONSTRAINT session_package_unique UNIQUE (start_on, member_id, session_id, member_package_id)
);


CREATE INDEX IF NOT EXISTS idx_reservations_member_id ON reservations (member_id);
CREATE INDEX IF NOT EXISTS idx_reservations_location_id ON reservations (location_id);
CREATE INDEX IF NOT EXISTS idx_reservations_session_id ON reservations (session_id);


CREATE TABLE IF NOT EXISTS check_ins (
  id text PRIMARY KEY NOT NULL DEFAULT uuid_base62('chk_'),
  reservation_id text REFERENCES reservations (id) ON DELETE CASCADE NOT NULL,
  start_time timestamp with time zone NOT NULL,
  end_time timestamp with time zone NOT NULL,
  check_in_time timestamp with time zone NOT NULL,
  check_out_time timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone,
  ip_address text,
  lat numeric,
  lng numeric,
  mac_address text
);

CREATE INDEX IF NOT EXISTS idx_check_ins_reservation_id ON check_ins (reservation_id);
CREATE INDEX IF NOT EXISTS idx_check_ins_check_in_time ON check_ins (check_in_time);


CREATE TABLE IF NOT EXISTS achievements (
  id text PRIMARY KEY NOT NULL DEFAULT uuid_base62(),
  name text NOT NULL,
  description text NOT NULL,
  badge text NOT NULL,
  location_id text REFERENCES locations (id) ON DELETE CASCADE NOT NULL,
  required_action_count integer NOT NULL,
  points integer NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS achievement_triggers (
  id text PRIMARY KEY NOT NULL DEFAULT uuid_base62(),
  type text NOT NULL,
  achievement_id text REFERENCES achievements (id) ON DELETE CASCADE NOT NULL,
  weight integer NOT NULL,
  CONSTRAINT unique_achievement_trigger UNIQUE (achievement_id, type)
);


CREATE TABLE IF NOT EXISTS member_achievements (
  achievement_id text REFERENCES achievements (id) ON DELETE CASCADE NOT NULL,
  member_id text REFERENCES members (id) ON DELETE CASCADE NOT NULL,
  location_id text REFERENCES locations (id) ON DELETE CASCADE NOT NULL,
  progress integer NOT NULL DEFAULT 0,
  date_achieved timestamp with time zone DEFAULT now(),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone
);


CREATE INDEX IF NOT EXISTS idx_achievement_actions_achievement_id ON achievement_actions (achievement_id);
CREATE INDEX IF NOT EXISTS idx_achievement_actions_action_id ON achievement_actions (action_id);


CREATE TABLE IF NOT EXISTS rewards (
  id text PRIMARY KEY NOT NULL DEFAULT uuid_base62(),
  name text NOT NULL,
  description text NOT NULL,
  location_id text NOT NULL,
  icon text,
  required_points integer NOT NULL,
  limit_per_member integer NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone,
  limit_total text NOT NULL DEFAULT 'unlimited',
  images text[] NOT NULL DEFAULT '{}',
  CONSTRAINT rewards_location_id_foreign FOREIGN KEY (location_id) REFERENCES locations (id) ON DELETE CASCADE
);


CREATE TABLE IF NOT EXISTS reward_claims (
  id text PRIMARY KEY NOT NULL DEFAULT uuid_base62(),
  reward_id text NOT NULL,
  member_id text NOT NULL,
  previous_points integer,
  date_claimed timestamp with time zone,
  status smallint NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone,
  deleted_at timestamp with time zone,
  CONSTRAINT reward_claims_member_id_foreign FOREIGN KEY (member_id) REFERENCES members (id),
  CONSTRAINT reward_claims_reward_id_foreign FOREIGN KEY (reward_id) REFERENCES rewards (id)
);




CREATE TABLE IF NOT EXISTS member_referrals (
  member_id text REFERENCES members (id) ON DELETE CASCADE NOT NULL,
  referred_member_id text REFERENCES members (id) ON DELETE CASCADE NOT NULL,
  location_id text REFERENCES locations (id) ON DELETE CASCADE NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone,
  CONSTRAINT member_referrals_pkey PRIMARY KEY (member_id, referred_member_id, location_id),
  CONSTRAINT member_referrals_unique UNIQUE (member_id, referred_member_id, location_id)
);


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

-- Tables with dependencies on vendors and locations
CREATE TABLE IF NOT EXISTS vendor_levels (
  id text PRIMARY KEY NOT NULL DEFAULT uuid_base62(),
  vendor_id text REFERENCES vendors (id) ON DELETE CASCADE NOT NULL,
  points integer NOT NULL DEFAULT 0,
  total_points integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS vendor_badges (
  id text PRIMARY KEY NOT NULL DEFAULT uuid_base62(),
  vendor_level_id text NOT NULL,
  badge_id text NOT NULL, -- this is the badge id is hardcoded
  progress integer NOT NULL,
  completed boolean NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  claimed_at timestamp with time zone,
  CONSTRAINT vendor_badges_vendor_level_id_foreign FOREIGN KEY (vendor_level_id) REFERENCES vendor_levels (id) ON DELETE CASCADE
);


CREATE TABLE IF NOT EXISTS vendor_rewards (
  id text PRIMARY KEY NOT NULL DEFAULT uuid_base62(),
  name text NOT NULL,
  description text NOT NULL,
  images text NOT NULL,
  meta jsonb NOT NULL,
  required_points integer NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone
);

-- Tables with dependencies on vendor_levels and vendor_rewards
CREATE TABLE IF NOT EXISTS vendor_claimed_rewards (
  id text PRIMARY KEY NOT NULL DEFAULT uuid_base62(),
  vendor_level_id text NOT NULL,
  reward_id text NOT NULL,
  claimed_at timestamp with time zone NOT NULL,
  CONSTRAINT vendor_claimed_rewards_reward_id_foreign FOREIGN KEY (reward_id) REFERENCES vendor_rewards (id) ON DELETE CASCADE,
  CONSTRAINT vendor_claimed_rewards_vendor_level_id_foreign FOREIGN KEY (vendor_level_id) REFERENCES vendor_levels (id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS vendor_referrals (
  id text PRIMARY KEY NOT NULL DEFAULT uuid_base62(),
  amount integer NOT NULL,
  vendor_id text NOT NULL,
  referral_id text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  accepted_at timestamp with time zone,
  CONSTRAINT vendor_referrals_vendor_id_foreign FOREIGN KEY (vendor_id) REFERENCES vendors (id) ON DELETE CASCADE
);

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


-- Tables with dependencies on staffs and locations
CREATE TABLE IF NOT EXISTS staff_locations (
  id text PRIMARY KEY NOT NULL DEFAULT uuid_base62(),
  staff_id text NOT NULL,
  location_id text NOT NULL,
  status staff_status NOT NULL DEFAULT 'active',
  CONSTRAINT staff_locations_staff_id_foreign FOREIGN KEY (staff_id) REFERENCES staffs (id) ON DELETE CASCADE,
  CONSTRAINT staff_locations_location_id_foreign FOREIGN KEY (location_id) REFERENCES locations (id) ON DELETE CASCADE,
  CONSTRAINT staff_locations_staff_location_unique UNIQUE (staff_id, location_id)
);

CREATE INDEX IF NOT EXISTS idx_staff_locations_staff_id ON staff_locations (staff_id);
CREATE INDEX IF NOT EXISTS idx_staff_locations_location_id ON staff_locations (location_id);

CREATE TABLE IF NOT EXISTS staff_location_roles (
  staff_location_id text NOT NULL,
  role_id text NOT NULL,
  CONSTRAINT staff_location_roles_pkey PRIMARY KEY (staff_location_id, role_id),
  CONSTRAINT staff_location_roles_staff_location_fkey FOREIGN KEY (staff_location_id) REFERENCES staff_locations (id) ON DELETE CASCADE,
  CONSTRAINT staff_location_roles_role_id_fkey FOREIGN KEY (role_id) REFERENCES roles (id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_staff_location_roles_staff_location_id ON staff_location_roles (staff_location_id);
CREATE INDEX IF NOT EXISTS idx_staff_location_roles_role_id ON staff_location_roles (role_id);
