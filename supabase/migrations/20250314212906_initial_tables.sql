-- Create ENUM types with IF NOT EXISTS
CREATE TYPE IF NOT EXISTS contract_type AS ENUM('contract', 'waiver');
CREATE TYPE IF NOT EXISTS invoice_status AS ENUM('draft', 'paid', 'unpaid', 'uncollectible', 'void');
CREATE TYPE IF NOT EXISTS location_status AS ENUM('incomplete', 'active', 'past_due', 'canceled', 'paused', 'trialing', 'unpaid', 'incomplete_expired');
CREATE TYPE IF NOT EXISTS relationship AS ENUM('parent', 'spouse', 'child', 'sibling', 'other');
CREATE TYPE IF NOT EXISTS package_status AS ENUM('active', 'incomplete', 'expired', 'completed');
CREATE TYPE IF NOT EXISTS payment_method AS ENUM('card', 'cash', 'check', 'zelle', 'venmo', 'paypal', 'apple', 'google');
CREATE TYPE IF NOT EXISTS plan_interval AS ENUM('day', 'week', 'month', 'year');
CREATE TYPE IF NOT EXISTS plan_type AS ENUM('recurring', 'one-time');
CREATE TYPE IF NOT EXISTS reservation_status AS ENUM('active', 'expired', 'canceled');
CREATE TYPE IF NOT EXISTS role_color AS ENUM('red', 'green', 'blue', 'pink', 'cyan', 'lime', 'orange', 'fuchsia', 'sky', 'lemon', 'purple', 'yellow');
CREATE TYPE IF NOT EXISTS transaction_status AS ENUM('paid', 'failed', 'incomplete');
CREATE TYPE IF NOT EXISTS staff_status AS ENUM('active', 'inactive');
CREATE TYPE IF NOT EXISTS support_ticket_status AS ENUM('open', 'updated', 'closed');

-- Function for current timestamp
CREATE OR REPLACE FUNCTION current_timestamp() RETURNS timestamp with time zone AS $$
BEGIN
    RETURN now();
END;
$$ LANGUAGE plpgsql;

-- Base tables with no foreign key dependencies
CREATE TABLE IF NOT EXISTS users (
  id bigserial PRIMARY KEY NOT NULL,
  name text NOT NULL,
  email text NOT NULL UNIQUE,
  email_verified_at timestamp with time zone,
  password text,
  created_at timestamp with time zone NOT NULL DEFAULT current_timestamp(),
  updated_at timestamp with time zone,
  deleted_at timestamp with time zone,
  CONSTRAINT users_email_unique UNIQUE (email)
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users (email);

CREATE TABLE IF NOT EXISTS actions (
  id bigserial PRIMARY KEY NOT NULL,
  name text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT current_timestamp(),
  updated_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS permissions (
  id bigserial PRIMARY KEY NOT NULL,
  name text NOT NULL,
  guard_name text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT current_timestamp(),
  updated_at timestamp with time zone,
  description text,
  CONSTRAINT permissions_name_guard_name_unique UNIQUE (name, guard_name)
);

-- Tables with dependencies on users
CREATE TABLE IF NOT EXISTS vendors (
  id bigserial PRIMARY KEY NOT NULL,
  first_name text NOT NULL,
  last_name text,
  user_id bigint NOT NULL,
  stripe_customer_id text,
  email text NOT NULL,
  icon text,
  phone_number text,
  created_at timestamp with time zone NOT NULL DEFAULT current_timestamp(),
  updated_at timestamp with time zone,
  deleted_at timestamp with time zone,
  CONSTRAINT vendors_email_unique UNIQUE (email),
  CONSTRAINT vendors_user_id_foreign FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_vendors_email ON vendors (email);
CREATE INDEX IF NOT EXISTS idx_vendors_user_id ON vendors (user_id);

CREATE TABLE IF NOT EXISTS members (
  id bigserial PRIMARY KEY NOT NULL,
  user_id bigint NOT NULL,
  email text NOT NULL,
  phone text,
  referral_code text,
  current_points integer DEFAULT 0,
  avatar text,
  created_at timestamp with time zone NOT NULL DEFAULT current_timestamp(),
  updated_at timestamp with time zone,
  deleted_at timestamp with time zone,
  first_name text,
  last_name text,
  gender text,
  dob date,
  CONSTRAINT members_user_id_foreign FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
  CONSTRAINT members_email_unique UNIQUE (email),
  CONSTRAINT members_referral_code_unique UNIQUE (referral_code)
);

CREATE INDEX IF NOT EXISTS idx_members_email ON members (email);
CREATE INDEX IF NOT EXISTS idx_members_user_id ON members (user_id);

CREATE TABLE IF NOT EXISTS sessions (
  id bigserial PRIMARY KEY NOT NULL,
  session_token text NOT NULL,
  user_id bigint NOT NULL,
  expires timestamp with time zone NOT NULL,
  ip_address text,
  browser_id text,
  machine_id text,
  created_at timestamp with time zone NOT NULL DEFAULT current_timestamp(),
  updated_at timestamp with time zone,
  CONSTRAINT sessions_user_id_foreign FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions (user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_session_token ON sessions (session_token);

-- Tables with dependencies on vendors
CREATE TABLE IF NOT EXISTS locations (
  id bigserial PRIMARY KEY NOT NULL,
  name text NOT NULL,
  address text,
  city text,
  state text,
  logo_url text,
  country text,
  postal_code text,
  website text,
  email text,
  phone text,
  timezone text,
  vendor_id bigint,
  meta_data jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT current_timestamp(),
  updated_at timestamp with time zone,
  deleted_at timestamp with time zone,
  industry text,
  legal_name text,
  CONSTRAINT locations_address_key UNIQUE (address),
  CONSTRAINT locations_vendor_id_foreign FOREIGN KEY (vendor_id) REFERENCES vendors (id)
);

CREATE INDEX IF NOT EXISTS idx_locations_vendor_id ON locations (vendor_id);

CREATE TABLE IF NOT EXISTS vendor_rewards (
  id bigserial PRIMARY KEY NOT NULL,
  name text NOT NULL,
  description text NOT NULL,
  images text NOT NULL,
  meta jsonb NOT NULL,
  required_points integer NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT current_timestamp(),
  updated_at timestamp with time zone
);

-- Tables with dependencies on locations
CREATE TABLE IF NOT EXISTS contracts (
  id bigserial PRIMARY KEY NOT NULL,
  content text,
  title text,
  description text,
  created_at timestamp with time zone NOT NULL DEFAULT current_timestamp(),
  updated_at timestamp with time zone,
  deleted_at timestamp with time zone,
  is_draft boolean NOT NULL DEFAULT false,
  editable boolean NOT NULL DEFAULT true,
  location_id bigint,
  type contract_type NOT NULL DEFAULT 'contract'::contract_type,
  require_signature boolean NOT NULL DEFAULT true,
  CONSTRAINT contracts_location_id_fkey FOREIGN KEY (location_id) REFERENCES locations (id) ON UPDATE CASCADE ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS roles (
  id bigserial PRIMARY KEY NOT NULL,
  name text NOT NULL,
  guard_name text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT current_timestamp(),
  updated_at timestamp with time zone,
  location_id bigint,
  color role_color,
  CONSTRAINT roles_name_guard_name_unique UNIQUE (name, guard_name),
  CONSTRAINT roles_location_id_foreign FOREIGN KEY (location_id) REFERENCES locations (id)
);

CREATE TABLE IF NOT EXISTS programs (
  id bigserial PRIMARY KEY NOT NULL,
  location_id bigint NOT NULL,
  name text NOT NULL,
  description text NOT NULL,
  icon text,
  created_at timestamp with time zone NOT NULL DEFAULT current_timestamp(),
  updated_at timestamp with time zone,
  deleted_at timestamp with time zone,
  CONSTRAINT programs_location_id_foreign FOREIGN KEY (location_id) REFERENCES locations (id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_programs_location_id ON programs (location_id);

CREATE TABLE IF NOT EXISTS achievements (
  id bigserial PRIMARY KEY NOT NULL,
  title text NOT NULL,
  badge text NOT NULL,
  location_id bigint NOT NULL,
  points bigint NOT NULL,
  description text,
  icon text,
  created_at timestamp with time zone NOT NULL DEFAULT current_timestamp(),
  updated_at timestamp with time zone,
  CONSTRAINT achievements_location_id_foreign FOREIGN KEY (location_id) REFERENCES locations (id)
);

CREATE TABLE IF NOT EXISTS rewards (
  id bigserial PRIMARY KEY NOT NULL,
  name text NOT NULL,
  description text NOT NULL,
  location_id bigint NOT NULL,
  icon text,
  required_points integer NOT NULL,
  limit_per_member integer NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT current_timestamp(),
  updated_at timestamp with time zone,
  limit_total text NOT NULL DEFAULT 'unlimited',
  images text[] NOT NULL DEFAULT '{}',
  CONSTRAINT rewards_location_id_foreign FOREIGN KEY (location_id) REFERENCES locations (id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS support_tickets (
  id bigserial PRIMARY KEY NOT NULL,
  subject text NOT NULL,
  issue text NOT NULL,
  video text,
  account_id text NOT NULL,
  description text,
  status support_ticket_status NOT NULL DEFAULT 'open',
  location_id bigint NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT current_timestamp(),
  updated_at timestamp with time zone,
  deleted_at timestamp with time zone,
  CONSTRAINT support_tickets_location_id_foreign FOREIGN KEY (location_id) REFERENCES locations (id)
);

CREATE INDEX IF NOT EXISTS idx_support_tickets_location_id ON support_tickets (location_id);

CREATE TABLE IF NOT EXISTS wallet (
  id bigserial PRIMARY KEY NOT NULL,
  location_id bigint NOT NULL,
  balance bigint NOT NULL DEFAULT 0,
  credit bigint NOT NULL DEFAULT 0,
  recharge_amount bigint NOT NULL DEFAULT 20,
  recharge_threshold bigint NOT NULL DEFAULT 10,
  last_charged timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT current_timestamp(),
  updated_at timestamp with time zone,
  deleted_at timestamp with time zone,
  CONSTRAINT wallet_location_id_key UNIQUE (location_id),
  CONSTRAINT wallet_location_id_foreign FOREIGN KEY (location_id) REFERENCES locations (id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS import_members (
  id bigserial PRIMARY KEY NOT NULL,
  first_name text NOT NULL,
  last_name text NOT NULL,
  email text NOT NULL,
  phone text NOT NULL,
  last_renewal_day date NOT NULL,
  status text NOT NULL DEFAULT 'active',
  terms plan_interval NOT NULL DEFAULT 'month',
  term_count integer NOT NULL,
  created_at timestamp with time zone DEFAULT current_timestamp(),
  updated_at timestamp with time zone,
  program_id bigint,
  plan_id bigint,
  processed boolean NOT NULL DEFAULT false,
  location_id bigint NOT NULL,
  CONSTRAINT import_members_location_id_fkey FOREIGN KEY (location_id) REFERENCES locations (id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS location_state (
  location_id bigint NOT NULL,
  plan_id bigint,
  pkg_id bigint,
  payment_plan_id bigint,
  status location_status NOT NULL DEFAULT 'incomplete',
  agree_to_terms boolean NOT NULL DEFAULT false,
  last_renewal_date timestamp with time zone DEFAULT current_timestamp(),
  start_date timestamp with time zone,
  settings jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT current_timestamp(),
  updated_at timestamp with time zone,
  usage_percent integer NOT NULL DEFAULT 0,
  waiver_id bigint,
  CONSTRAINT location_state_location_id_key UNIQUE (location_id),
  CONSTRAINT location_state_location_id_fkey FOREIGN KEY (location_id) REFERENCES locations (id) ON DELETE CASCADE,
  CONSTRAINT location_state_waiver_id_fkey FOREIGN KEY (waiver_id) REFERENCES contracts (id) ON DELETE SET NULL
);

-- Tables with dependencies on roles
CREATE TABLE IF NOT EXISTS role_has_permissions (
  permission_id bigint NOT NULL,
  role_id bigint NOT NULL,
  CONSTRAINT role_has_permissions_pkey PRIMARY KEY (permission_id, role_id),
  CONSTRAINT role_has_permissions_permission_id_foreign FOREIGN KEY (permission_id) REFERENCES permissions (id) ON DELETE CASCADE,
  CONSTRAINT role_has_permissions_role_id_foreign FOREIGN KEY (role_id) REFERENCES roles (id) ON DELETE CASCADE
);

-- Tables with dependencies on members and locations
CREATE TABLE IF NOT EXISTS member_locations (
  location_id bigint NOT NULL,
  member_id bigint NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT current_timestamp(),
  updated_at timestamp with time zone,
  stripe_customer_id text,
  status location_status NOT NULL DEFAULT 'incomplete',
  invite_date timestamp with time zone,
  invite_accepted_date timestamp with time zone,
  incomplete_plan jsonb,
  waiver_id bigint,
  CONSTRAINT member_locations_pkey PRIMARY KEY (location_id, member_id),
  CONSTRAINT member_locations_location_id_foreign FOREIGN KEY (location_id) REFERENCES locations (id) ON DELETE CASCADE,
  CONSTRAINT member_locations_member_id_foreign FOREIGN KEY (member_id) REFERENCES members (id) ON DELETE CASCADE,
  CONSTRAINT member_locations_waiver_id_fkey FOREIGN KEY (waiver_id) REFERENCES contracts (id) ON DELETE SET NULL,
  CONSTRAINT member_locations_unique UNIQUE (location_id, member_id)
);

CREATE INDEX IF NOT EXISTS idx_member_locations_location_member ON member_locations (location_id, member_id);

CREATE TABLE IF NOT EXISTS member_achievements (
  id bigserial PRIMARY KEY NOT NULL,
  achievement_id bigint NOT NULL,
  member_id bigint NOT NULL,
  status text NOT NULL,
  note text,
  progress integer NOT NULL DEFAULT 0,
  date_achieved timestamp with time zone DEFAULT current_timestamp(),
  created_at timestamp with time zone NOT NULL DEFAULT current_timestamp(),
  updated_at timestamp with time zone,
  CONSTRAINT member_achievements_achievement_id_foreign FOREIGN KEY (achievement_id) REFERENCES achievements (id),
  CONSTRAINT member_achievements_member_id_foreign FOREIGN KEY (member_id) REFERENCES members (id)
);

CREATE TABLE IF NOT EXISTS member_referrals (
  id bigserial PRIMARY KEY NOT NULL,
  member_id bigint NOT NULL,
  referred_member_id bigint NOT NULL,
  location_id bigint NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT current_timestamp(),
  updated_at timestamp with time zone,
  CONSTRAINT member_referrals_location_id_foreign FOREIGN KEY (location_id) REFERENCES locations (id) ON DELETE CASCADE,
  CONSTRAINT member_referrals_member_id_foreign FOREIGN KEY (member_id) REFERENCES members (id) ON DELETE CASCADE,
  CONSTRAINT member_referrals_referred_member_id_foreign FOREIGN KEY (referred_member_id) REFERENCES members (id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS reward_claims (
  id bigserial PRIMARY KEY NOT NULL,
  reward_id bigint NOT NULL,
  member_id bigint NOT NULL,
  previous_points integer,
  date_claimed timestamp with time zone,
  status smallint NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT current_timestamp(),
  updated_at timestamp with time zone,
  deleted_at timestamp with time zone,
  CONSTRAINT reward_claims_member_id_foreign FOREIGN KEY (member_id) REFERENCES members (id),
  CONSTRAINT reward_claims_reward_id_foreign FOREIGN KEY (reward_id) REFERENCES rewards (id)
);

-- Tables with dependencies on vendors and locations
CREATE TABLE IF NOT EXISTS vendor_levels (
  id bigserial PRIMARY KEY NOT NULL,
  vendor_id bigint,
  location_id bigint NOT NULL,
  points integer NOT NULL DEFAULT 0,
  total_points integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT current_timestamp(),
  updated_at timestamp with time zone,
  CONSTRAINT vendor_levels_location_id_foreign FOREIGN KEY (location_id) REFERENCES locations (id) ON DELETE CASCADE,
  CONSTRAINT vendor_levels_vendor_id_foreign FOREIGN KEY (vendor_id) REFERENCES vendors (id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS integrations (
  id bigserial PRIMARY KEY NOT NULL,
  vendor_id bigint NOT NULL,
  service text NOT NULL,
  api_key text,
  secret_key text,
  access_token text,
  refresh_token text,
  integration_id text NOT NULL,
  additional_settings jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone DEFAULT current_timestamp(),
  updated_at timestamp with time zone,
  location_id bigint,
  CONSTRAINT unique_service_location UNIQUE (service, location_id),
  CONSTRAINT integrations_location_id_foreign FOREIGN KEY (location_id) REFERENCES locations (id) ON DELETE CASCADE,
  CONSTRAINT integrations_vendor_id_foreign FOREIGN KEY (vendor_id) REFERENCES vendors (id) ON DELETE CASCADE
);

-- Tables with dependencies on vendor_levels and vendor_rewards
CREATE TABLE IF NOT EXISTS vendor_claimed_rewards (
  id bigserial PRIMARY KEY NOT NULL,
  vendor_level_id bigint NOT NULL,
  reward_id bigint NOT NULL,
  claimed_at timestamp with time zone NOT NULL,
  CONSTRAINT vendor_claimed_rewards_reward_id_foreign FOREIGN KEY (reward_id) REFERENCES vendor_rewards (id) ON DELETE CASCADE,
  CONSTRAINT vendor_claimed_rewards_vendor_level_id_foreign FOREIGN KEY (vendor_level_id) REFERENCES vendor_levels (id) ON DELETE CASCADE
);

-- Tables with dependencies on wallet
CREATE TABLE IF NOT EXISTS wallet_usage (
  id bigserial PRIMARY KEY NOT NULL,
  wallet_id bigint NOT NULL,
  description text NOT NULL,
  category text NOT NULL,
  amount integer NOT NULL DEFAULT 0,
  event_id bigint NOT NULL DEFAULT 0,
  balance integer NOT NULL DEFAULT 0,
  recharge_threshold integer NOT NULL DEFAULT 0,
  activity_date date NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT current_timestamp(),
  updated_at timestamp with time zone,
  deleted_at timestamp with time zone,
  CONSTRAINT wallet_usage_wallet_id_foreign FOREIGN KEY (wallet_id) REFERENCES wallet (id) ON DELETE CASCADE
);

-- Tables with dependencies on programs
CREATE TABLE IF NOT EXISTS member_plans (
  id bigserial PRIMARY KEY NOT NULL,
  name character varying(255) NOT NULL,
  description character varying(255) NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT current_timestamp(),
  updated_at timestamp with time zone,
  deleted_at timestamp with time zone,
  family boolean NOT NULL DEFAULT false,
  program_id bigint,
  family_member_limit integer NOT NULL DEFAULT 0,
  contract_id bigint,
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
  allow_proration boolean NOT NULL DEFAULT false,
  archived boolean NOT NULL DEFAULT false,
  class_limit_threshold smallint,
  expire_interval plan_interval,
  expire_threshold smallint,
  CONSTRAINT member_plans_contract_id_foreign FOREIGN KEY (contract_id) REFERENCES contracts (id) ON DELETE CASCADE,
  CONSTRAINT member_plans_program_id_foreign FOREIGN KEY (program_id) REFERENCES programs (id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_member_plans_program_id ON member_plans (program_id);

-- Tables with dependencies on roles, users, and locations
CREATE TABLE IF NOT EXISTS staffs (
  id bigserial PRIMARY KEY NOT NULL,
  first_name text NOT NULL,
  last_name text NOT NULL,
  email text NOT NULL,
  phone text NOT NULL,
  avatar text,
  user_id bigint NOT NULL,
  role_id bigint,
  location_id bigint,
  created_at timestamp with time zone NOT NULL DEFAULT current_timestamp(),
  updated_at timestamp with time zone,
  deleted_at timestamp with time zone,
  CONSTRAINT staffs_location_id_foreign FOREIGN KEY (location_id) REFERENCES locations (id) ON DELETE CASCADE,
  CONSTRAINT staffs_role_id_foreign FOREIGN KEY (role_id) REFERENCES roles (id) ON DELETE SET NULL,
  CONSTRAINT staffs_user_id_foreign FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
);

-- Tables with dependencies on staffs and locations
CREATE TABLE IF NOT EXISTS staff_locations (
  staff_id bigint NOT NULL,
  location_id bigint NOT NULL,
  status staff_status NOT NULL DEFAULT 'active',
  CONSTRAINT staff_locations_pkey PRIMARY KEY (staff_id, location_id),
  CONSTRAINT staff_locations_staff_id_foreign FOREIGN KEY (staff_id) REFERENCES staffs (id) ON DELETE CASCADE,
  CONSTRAINT staff_locations_location_id_foreign FOREIGN KEY (location_id) REFERENCES locations (id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_staff_locations_staff_id ON staff_locations (staff_id);
CREATE INDEX IF NOT EXISTS idx_staff_locations_location_id ON staff_locations (location_id);

-- Tables with dependencies on programs and staffs
CREATE TABLE IF NOT EXISTS program_levels (
  id bigserial PRIMARY KEY NOT NULL,
  name text NOT NULL,
  capacity integer NOT NULL,
  min_age integer NOT NULL,
  max_age integer NOT NULL,
  program_id bigint NOT NULL,
  parent_id bigint,
  created_at timestamp with time zone NOT NULL DEFAULT current_timestamp(),
  updated_at timestamp with time zone,
  deleted_at timestamp with time zone,
  interval plan_interval NOT NULL DEFAULT 'week',
  interval_threshold smallint NOT NULL DEFAULT 1,
  instructor_id bigint,
  CONSTRAINT program_levels_instructor_id_fkey FOREIGN KEY (instructor_id) REFERENCES staffs (id) ON DELETE CASCADE,
  CONSTRAINT program_levels_parent_id_foreign FOREIGN KEY (parent_id) REFERENCES program_levels (id),
  CONSTRAINT program_levels_program_id_foreign FOREIGN KEY (program_id) REFERENCES programs (id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_program_levels_program_id ON program_levels (program_id);

CREATE TABLE IF NOT EXISTS program_sessions (
  id bigserial PRIMARY KEY NOT NULL,
  program_level_id bigint NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT current_timestamp(),
  updated_at timestamp with time zone,
  time time NOT NULL,
  duration smallint NOT NULL DEFAULT 0,
  day smallint NOT NULL DEFAULT 1 CHECK (day BETWEEN 1 AND 7),
  CONSTRAINT program_sessions_program_level_id_foreign FOREIGN KEY (program_level_id) REFERENCES program_levels (id) ON DELETE CASCADE,
  CONSTRAINT program_sessions_level_time_duration_unique UNIQUE (program_level_id, time, duration)
);

CREATE INDEX IF NOT EXISTS idx_program_sessions_program_level_id ON program_sessions (program_level_id);

-- Tables with dependencies on members and contracts
CREATE TABLE IF NOT EXISTS member_contracts (
  id bigserial PRIMARY KEY NOT NULL,
  member_id bigint NOT NULL,
  contract_id bigint NOT NULL,
  member_plan_id bigint,
  signed boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT current_timestamp(),
  updated_at timestamp with time zone,
  deleted_at timestamp with time zone,
  location_id bigint,
  variables jsonb NOT NULL DEFAULT '{}'::jsonb,
  signature text,
  CONSTRAINT member_contracts_contract_id_foreign FOREIGN KEY (contract_id) REFERENCES contracts (id) ON DELETE CASCADE,
  CONSTRAINT member_contracts_location_id_foreign FOREIGN KEY (location_id) REFERENCES locations (id) ON DELETE CASCADE,
  CONSTRAINT member_contracts_member_id_foreign FOREIGN KEY (member_id) REFERENCES members (id) ON DELETE CASCADE,
  CONSTRAINT member_contracts_member_plan_id_fkey FOREIGN KEY (member_plan_id) REFERENCES member_plans (id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_member_contracts_member_id ON member_contracts (member_id);

-- Tables with dependencies on members, member_plans, and program_levels
CREATE TABLE IF NOT EXISTS member_subscriptions (
  id bigserial PRIMARY KEY NOT NULL,
  payer_id bigint NOT NULL,
  beneficiary_id bigint NOT NULL,
  member_plan_id bigint,
  created_at timestamp with time zone NOT NULL DEFAULT current_timestamp(),
  updated_at timestamp with time zone,
  stripe_subscription_id text,
  status location_status NOT NULL DEFAULT 'incomplete',
  current_period_start timestamp with time zone,
  start_date timestamp with time zone NOT NULL,
  current_period_end timestamp with time zone,
  cancel_at timestamp with time zone,
  cancel_at_period_end boolean NOT NULL DEFAULT false,
  location_id bigint,
  trial_end timestamp with time zone,
  ended_at timestamp with time zone,
  payment_method payment_method NOT NULL DEFAULT 'card',
  metadata jsonb NOT NULL DEFAULT '{}',
  program_level_id bigint,
  member_contract_id bigint,
  CONSTRAINT member_payments_member_plan_id_fkey FOREIGN KEY (member_plan_id) REFERENCES member_plans (id) ON DELETE SET NULL,
  CONSTRAINT member_payments_payer_id_foreign FOREIGN KEY (payer_id) REFERENCES members (id) ON DELETE CASCADE,
  CONSTRAINT member_subscriptions_location_id_fkey FOREIGN KEY (location_id) REFERENCES locations (id) ON DELETE CASCADE,
  CONSTRAINT member_subscriptions_member_contract_id_fkey FOREIGN KEY (member_contract_id) REFERENCES member_contracts (id),
  CONSTRAINT member_subscriptions_program_level_id_fkey FOREIGN KEY (program_level_id) REFERENCES program_levels (id),
  CONSTRAINT member_payments_beneficiary_id_foreign FOREIGN KEY (beneficiary_id) REFERENCES members (id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_member_subscriptions_payer_id ON member_subscriptions (payer_id);
CREATE INDEX IF NOT EXISTS idx_member_subscriptions_beneficiary_id ON member_subscriptions (beneficiary_id);
CREATE INDEX IF NOT EXISTS idx_member_subscriptions_location_id ON member_subscriptions (location_id);
CREATE INDEX IF NOT EXISTS idx_member_subscriptions_status ON member_subscriptions (status);

-- Tables with dependencies on members, member_plans, and program_levels
CREATE TABLE IF NOT EXISTS member_packages (
  id bigserial PRIMARY KEY NOT NULL,
  member_plan_id bigint NOT NULL,
  payer_id bigint,
  beneficiary_id bigint NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT current_timestamp(),
  updated_at timestamp with time zone,
  status package_status NOT NULL DEFAULT 'incomplete',
  start_date timestamp with time zone NOT NULL,
  payment_method payment_method,
  metadata jsonb DEFAULT '{}'::jsonb,
  total_class_attended integer NOT NULL DEFAULT 0,
  total_class_limit integer NOT NULL DEFAULT 0,
  expire_date timestamp with time zone,
  location_id bigint NOT NULL,
  program_level_id bigint,
  member_contract_id bigint,
  CONSTRAINT member_packages_location_id_fkey FOREIGN KEY (location_id) REFERENCES locations (id) ON DELETE CASCADE,
  CONSTRAINT member_packages_member_contract_id_fkey FOREIGN KEY (member_contract_id) REFERENCES member_contracts (id),
  CONSTRAINT member_packages_beneficiary_id_fkey FOREIGN KEY (beneficiary_id) REFERENCES members (id) ON DELETE CASCADE,
  CONSTRAINT member_packages_payer_id_fkey FOREIGN KEY (payer_id) REFERENCES members (id) ON DELETE SET NULL,
  CONSTRAINT member_packages_program_level_id_fkey FOREIGN KEY (program_level_id) REFERENCES program_levels (id),
  CONSTRAINT member_packages_member_plan_id_fkey FOREIGN KEY (member_plan_id) REFERENCES member_plans (id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_payer_id ON member_packages USING btree (payer_id);
CREATE INDEX IF NOT EXISTS idx_beneficiary_id ON member_packages USING btree (beneficiary_id);
CREATE INDEX IF NOT EXISTS idx_member_packages_location_id ON member_packages (location_id);
CREATE INDEX IF NOT EXISTS idx_member_packages_status ON member_packages (status);

-- Tables with dependencies on members, locations, and member_subscriptions/packages
CREATE TABLE IF NOT EXISTS member_invoices (
  id bigserial PRIMARY KEY NOT NULL,
  settings jsonb DEFAULT '{}'::jsonb,
  currency text,
  member_id bigint NOT NULL,
  location_id bigint NOT NULL,
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
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  member_subscription_id bigint,
  member_package_id bigint,
  for_period_start timestamp with time zone,
  for_period_end timestamp with time zone,
  CONSTRAINT member_invoices_location_id_fkey FOREIGN KEY (location_id) 
    REFERENCES locations (id) ON DELETE CASCADE,
  CONSTRAINT member_invoices_member_id_fkey FOREIGN KEY (member_id) 
    REFERENCES members (id) ON DELETE CASCADE,
  CONSTRAINT member_invoices_member_package_id_fkey FOREIGN KEY (member_package_id) 
    REFERENCES member_packages (id) ON DELETE CASCADE,
  CONSTRAINT member_invoices_member_subscription_id_fkey FOREIGN KEY (member_subscription_id) 
    REFERENCES member_subscriptions (id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_member_invoices_member_id ON member_invoices (member_id);
CREATE INDEX IF NOT EXISTS idx_member_invoices_location_id ON member_invoices (location_id);
CREATE INDEX IF NOT EXISTS idx_member_invoices_status ON member_invoices (status);

CREATE TABLE IF NOT EXISTS reservations (
  id bigserial PRIMARY KEY NOT NULL,
  session_id bigint NOT NULL,
  status reservation_status NOT NULL DEFAULT 'active',
  created_at timestamp with time zone NOT NULL DEFAULT current_timestamp(),
  updated_at timestamp with time zone,  
  location_id bigint NOT NULL,
  expired_on timestamp with time zone,
  member_subscription_id bigint,
  canceled_on timestamp with time zone,
  member_package_id bigint,
  member_id bigint NOT NULL,
  CONSTRAINT reservations_location_id_fkey FOREIGN KEY (location_id) REFERENCES locations (id) ON DELETE CASCADE,
  CONSTRAINT reservations_member_id_fkey FOREIGN KEY (member_id) REFERENCES members (id) ON DELETE CASCADE,
  CONSTRAINT reservations_member_package_id_fkey FOREIGN KEY (member_package_id) REFERENCES member_packages (id) ON DELETE CASCADE,
  CONSTRAINT reservations_member_subscription_id_fkey FOREIGN KEY (member_subscription_id) REFERENCES member_subscriptions (id) ON DELETE CASCADE,
  CONSTRAINT reservations_session_id_foreign FOREIGN KEY (session_id) REFERENCES program_sessions (id) ON DELETE CASCADE,
  CONSTRAINT reservations_session_member_location_unique UNIQUE (session_id, member_id, location_id)
);

CREATE INDEX IF NOT EXISTS idx_reservations_member_id ON reservations (member_id);
CREATE INDEX IF NOT EXISTS idx_reservations_location_id ON reservations (location_id);
CREATE INDEX IF NOT EXISTS idx_reservations_session_id ON reservations (session_id);
CREATE INDEX IF NOT EXISTS idx_reservations_status ON reservations (status);

CREATE TABLE IF NOT EXISTS members (
  id bigserial PRIMARY KEY NOT NULL,
  user_id bigint NOT NULL,
  email text NOT NULL,
  phone text,
  referral_code text,
  current_points integer DEFAULT 0,
  avatar text,
  created_at timestamp with time zone NOT NULL DEFAULT current_timestamp(),
  updated_at timestamp with time zone,
  deleted_at timestamp with time zone,
  first_name text,
  last_name text,
  gender text,
  dob date,
  CONSTRAINT members_user_id_foreign FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
  CONSTRAINT members_email_unique UNIQUE (email),
  CONSTRAINT members_referral_code_unique UNIQUE (referral_code)
);

CREATE INDEX IF NOT EXISTS idx_members_email ON members (email);
CREATE INDEX IF NOT EXISTS idx_members_user_id ON members (user_id);

CREATE TABLE IF NOT EXISTS permissions (
  id bigserial PRIMARY KEY NOT NULL,
  name text NOT NULL,
  guard_name text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT current_timestamp(),
  updated_at timestamp with time zone ,
  description text,
  CONSTRAINT permissions_name_guard_name_unique UNIQUE (name, guard_name)
);

CREATE TABLE IF NOT EXISTS program_levels (
  id bigserial PRIMARY KEY NOT NULL,
  name text NOT NULL,
  capacity integer NOT NULL,
  min_age integer NOT NULL,
  max_age integer NOT NULL,
  program_id bigint NOT NULL,
  parent_id bigint,
  created_at timestamp with time zone NOT NULL DEFAULT current_timestamp(),
  updated_at timestamp with time zone,
  deleted_at timestamp with time zone,
  interval plan_interval NOT NULL DEFAULT 'week',
  interval_threshold smallint NOT NULL DEFAULT 1,
  instructor_id bigint,
  CONSTRAINT program_levels_instructor_id_fkey FOREIGN KEY (instructor_id) REFERENCES staffs (id) ON DELETE CASCADE,
  CONSTRAINT program_levels_parent_id_foreign FOREIGN KEY (parent_id) REFERENCES program_levels (id),
  CONSTRAINT program_levels_program_id_foreign FOREIGN KEY (program_id) REFERENCES programs (id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_program_levels_program_id ON program_levels (program_id);

CREATE TABLE IF NOT EXISTS program_sessions (
  id bigserial PRIMARY KEY NOT NULL,
  program_level_id bigint NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT current_timestamp(),
  updated_at timestamp with time zone,
  time time NOT NULL,
  duration smallint NOT NULL DEFAULT 0,
  day smallint NOT NULL DEFAULT 1 CHECK (day BETWEEN 1 AND 7),
  CONSTRAINT program_sessions_program_level_id_foreign FOREIGN KEY (program_level_id) REFERENCES program_levels (id) ON DELETE CASCADE,
  CONSTRAINT program_sessions_level_time_duration_unique UNIQUE (program_level_id, time, duration)
);

CREATE INDEX IF NOT EXISTS idx_program_sessions_program_level_id ON program_sessions (program_level_id);

CREATE TABLE IF NOT EXISTS programs (
  id bigserial PRIMARY KEY NOT NULL,
  location_id bigint NOT NULL,
  name text NOT NULL,
  description text NOT NULL,
  icon text,
  created_at timestamp with time zone NOT NULL DEFAULT current_timestamp(),
  updated_at timestamp with time zone,
  deleted_at timestamp with time zone,
  CONSTRAINT programs_location_id_foreign FOREIGN KEY (location_id) REFERENCES locations (id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_programs_location_id ON programs (location_id);

CREATE TABLE IF NOT EXISTS reservations (
  id bigserial PRIMARY KEY NOT NULL,
  session_id bigint NOT NULL,
  status reservation_status NOT NULL DEFAULT 'active',
  created_at timestamp with time zone NOT NULL DEFAULT current_timestamp(),
  updated_at timestamp with time zone,
  location_id bigint NOT NULL,
  expired_on timestamp with time zone,
  member_subscription_id bigint,
  canceled_on timestamp with time zone,
  member_package_id bigint,
  member_id bigint NOT NULL,
  CONSTRAINT reservations_location_id_foreign FOREIGN KEY (location_id) REFERENCES locations (id) ON DELETE CASCADE,
  CONSTRAINT reservations_member_id_foreign FOREIGN KEY (member_id) REFERENCES members (id) ON DELETE CASCADE,
  CONSTRAINT reservations_member_package_id_foreign FOREIGN KEY (member_package_id) REFERENCES member_packages (id) ON DELETE CASCADE,
  CONSTRAINT reservations_member_subscription_id_foreign FOREIGN KEY (member_subscription_id) REFERENCES member_subscriptions (id) ON DELETE CASCADE,
  CONSTRAINT reservations_session_id_foreign FOREIGN KEY (session_id) REFERENCES program_sessions (id) ON DELETE CASCADE,
  CONSTRAINT reservations_member_session_unique UNIQUE (member_id, session_id)
);

CREATE INDEX IF NOT EXISTS idx_reservations_member_id ON reservations (member_id);
CREATE INDEX IF NOT EXISTS idx_reservations_session_id ON reservations (session_id);
CREATE INDEX IF NOT EXISTS idx_reservations_status ON reservations (status);

CREATE TABLE IF NOT EXISTS reward_claims (
  id bigserial PRIMARY KEY NOT NULL,
  reward_id bigint NOT NULL,
  member_id bigint NOT NULL,
  previous_points integer,
  date_claimed timestamp with time zone,
  status smallint NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT current_timestamp(),
  updated_at timestamp with time zone,
  deleted_at timestamp with time zone,
  CONSTRAINT reward_claims_member_id_foreign FOREIGN KEY (member_id) REFERENCES members (id),
  CONSTRAINT reward_claims_reward_id_foreign FOREIGN KEY (reward_id) REFERENCES rewards (id)
);

CREATE TABLE IF NOT EXISTS rewards (
  id bigserial PRIMARY KEY NOT NULL,
  name text NOT NULL,
  description text NOT NULL,
  location_id bigint NOT NULL,
  icon text,
  required_points integer NOT NULL,
  limit_per_member integer NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT current_timestamp(),
  updated_at timestamp with time zone,
  limit_total text NOT NULL DEFAULT 'unlimited',
  images text[] NOT NULL DEFAULT '{}',
  CONSTRAINT rewards_location_id_foreign FOREIGN KEY (location_id) REFERENCES locations (id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS role_has_permissions (
  permission_id bigint NOT NULL,
  role_id bigint NOT NULL,
  CONSTRAINT role_has_permissions_pkey PRIMARY KEY (permission_id, role_id),
  CONSTRAINT role_has_permissions_permission_id_foreign FOREIGN KEY (permission_id) REFERENCES permissions (id) ON DELETE CASCADE,
  CONSTRAINT role_has_permissions_role_id_foreign FOREIGN KEY (role_id) REFERENCES roles (id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS roles (
  id bigserial PRIMARY KEY NOT NULL,
  name text NOT NULL,
  guard_name text NOT NULL,
  created_at timestamp with time zone DEFAULT current_timestamp(),
  updated_at timestamp with time zone,
  location_id bigint,
  color role_color,
  CONSTRAINT roles_name_guard_name_unique UNIQUE (name, guard_name),
  CONSTRAINT roles_location_id_foreign FOREIGN KEY (location_id) REFERENCES locations (id)
);

CREATE TABLE IF NOT EXISTS sessions (
  id bigserial PRIMARY KEY NOT NULL,
  session_token text NOT NULL,
  user_id bigint NOT NULL,
  expires timestamp with time zone NOT NULL,
  ip_address text NOT NULL,
  browser_id text NOT NULL,
  machine_id text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT current_timestamp(),
  updated_at timestamp with time zone,
  CONSTRAINT sessions_user_id_foreign FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions (user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_session_token ON sessions (session_token);

CREATE TABLE IF NOT EXISTS staffs (
  id bigserial PRIMARY KEY NOT NULL,
  first_name text NOT NULL,
  last_name text NOT NULL,
  email text NOT NULL,
  phone text NOT NULL,
  avatar text,
  user_id bigint NOT NULL,
  role_id bigint,
  location_id bigint,
  created_at timestamp with time zone NOT NULL DEFAULT current_timestamp(),
  updated_at timestamp with time zone,
  deleted_at timestamp with time zone,
  CONSTRAINT staffs_location_id_foreign FOREIGN KEY (location_id) REFERENCES locations (id) ON DELETE CASCADE,
  CONSTRAINT staffs_role_id_foreign FOREIGN KEY (role_id) REFERENCES roles (id) ON DELETE SET NULL,
  CONSTRAINT staffs_user_id_foreign FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
);


CREATE TABLE IF NOT EXISTS staff_locations (
  staff_id bigint NOT NULL,
  location_id bigint NOT NULL,
  status staff_status NOT NULL DEFAULT 'active',
  CONSTRAINT staff_locations_staff_id_foreign FOREIGN KEY (staff_id) REFERENCES staffs (id) ON DELETE CASCADE,
  CONSTRAINT staff_locations_location_id_foreign FOREIGN KEY (location_id) REFERENCES locations (id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_staff_locations_staff_id ON staff_locations (staff_id);
CREATE INDEX IF NOT EXISTS idx_staff_locations_location_id ON staff_locations (location_id);

CREATE TABLE IF NOT EXISTS transactions (
  id bigserial PRIMARY KEY NOT NULL,
  description text,
  payment_method payment_method NOT NULL,
  transaction_type text NOT NULL,
  amount integer NOT NULL,
  status transaction_status NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT current_timestamp(),
  updated_at timestamp with time zone,
  deleted_at timestamp with time zone,
  location_id bigint NOT NULL,
  member_id bigint,
  payment_type plan_type NOT NULL DEFAULT 'one-time',
  item text,
  charge_date timestamp with time zone DEFAULT current_timestamp(),
  currency text NOT NULL DEFAULT 'USD',
  metadata jsonb NOT NULL DEFAULT '{}',
  refunded boolean NOT NULL DEFAULT false,
  invoice_id bigint,
  subscription_id bigint,
  package_id bigint,
  CONSTRAINT transactions_location_id_foreign FOREIGN KEY (location_id) REFERENCES locations (id) ON DELETE CASCADE,
  CONSTRAINT transactions_member_id_foreign FOREIGN KEY (member_id) REFERENCES members (id) ON DELETE CASCADE,
  CONSTRAINT transactions_invoice_id_fkey FOREIGN KEY (invoice_id) REFERENCES member_invoices (id),
  CONSTRAINT transactions_subscription_id_fkey FOREIGN KEY (subscription_id) REFERENCES member_subscriptions (id) ON DELETE CASCADE,
  CONSTRAINT transactions_package_id_fkey FOREIGN KEY (package_id) REFERENCES member_packages (id) ON DELETE CASCADE,
  CONSTRAINT transactions_invoice_id_key UNIQUE (invoice_id),
  CONSTRAINT transactions_transaction_type_check CHECK (    transaction_type IN ('incoming', 'refund', 'pending') )
);


CREATE TABLE IF NOT EXISTS support_tickets (
  id bigserial PRIMARY KEY NOT NULL,
  subject text NOT NULL,
  issue text NOT NULL,
  video text,
  account_id text NOT NULL,
  description text,
  status support_ticket_status NOT NULL DEFAULT 'open',
  location_id bigint NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT current_timestamp(),
  updated_at timestamp with time zone,
  deleted_at timestamp with time zone,
  CONSTRAINT support_tickets_location_id_foreign FOREIGN KEY (location_id) REFERENCES locations (id)
);

CREATE INDEX IF NOT EXISTS idx_support_tickets_location_id ON support_tickets (location_id);

CREATE TABLE IF NOT EXISTS vendors (
  id bigserial PRIMARY KEY NOT NULL,
  first_name text NOT NULL,
  last_name text,
  user_id bigint NOT NULL,
  stripe_customer_id text,
  email text NOT NULL,
  icon text,
  phone_number text,
  created_at timestamp with time zone NOT NULL DEFAULT current_timestamp(),
  updated_at timestamp with time zone,
  deleted_at timestamp with time zone,
  CONSTRAINT vendors_email_unique UNIQUE (email),
  CONSTRAINT vendors_user_id_foreign FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_vendors_email ON vendors (email);
CREATE INDEX IF NOT EXISTS idx_vendors_user_id ON vendors (user_id);


CREATE TABLE IF NOT EXISTS vendor_progress (
  id bigserial PRIMARY KEY NOT NULL,
  vendor_id bigint,
  location_id bigint NOT NULL,
  points integer NOT NULL DEFAULT 0,
  total_points integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT current_timestamp(),
  updated_at timestamp with time zone,
  CONSTRAINT vendor_progress_location_id_fkey FOREIGN KEY (location_id) REFERENCES locations (id) ON DELETE CASCADE,
  CONSTRAINT vendor_progress_vendor_id_fkey FOREIGN KEY (vendor_id) REFERENCES vendors (id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS vendor_badges (
  id bigserial PRIMARY KEY NOT NULL,
  vendor_progress_id bigint NOT NULL,
  badge_id bigint NOT NULL,
  progress integer NOT NULL,
  completed boolean NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT current_timestamp(),
  claimed_at timestamp with time zone,
  CONSTRAINT vendor_badges_vendor_progress_id_foreign FOREIGN KEY (vendor_progress_id) REFERENCES vendor_progress (id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS vendor_rewards (
  id bigserial PRIMARY KEY NOT NULL,
  name text NOT NULL,
  description text NOT NULL,
  images text NOT NULL,
  meta jsonb NOT NULL,
  required_points integer NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT current_timestamp(),
  updated_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS vendor_levels (
  id bigserial PRIMARY KEY NOT NULL,
  vendor_id bigint,
  location_id bigint NOT NULL,
  points integer NOT NULL DEFAULT 0,
  total_points integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT current_timestamp(),
  updated_at timestamp with time zone,
  CONSTRAINT vendor_levels_location_id_foreign FOREIGN KEY (location_id) REFERENCES locations (id) ON DELETE CASCADE,
  CONSTRAINT vendor_levels_vendor_id_foreign FOREIGN KEY (vendor_id) REFERENCES vendors (id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS vendor_claimed_rewards (
  id bigserial PRIMARY KEY NOT NULL,
  vendor_level_id bigint NOT NULL,
  reward_id bigint NOT NULL,
  claimed_at timestamp with time zone NOT NULL,
  CONSTRAINT vendor_claimed_rewards_reward_id_foreign FOREIGN KEY (reward_id) REFERENCES vendor_rewards (id) ON DELETE CASCADE,
  CONSTRAINT vendor_claimed_rewards_vendor_level_id_foreign FOREIGN KEY (vendor_level_id) REFERENCES vendor_levels (id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS vendor_referrals (
  id bigserial PRIMARY KEY NOT NULL,
  amount integer NOT NULL,
  vendor_id bigint NOT NULL,
  referral_id bigint NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT current_timestamp(),
  accepted_at timestamp with time zone,
  CONSTRAINT vendor_referrals_vendor_id_foreign FOREIGN KEY (vendor_id) REFERENCES vendors (id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS wallet (
  id bigserial PRIMARY KEY NOT NULL,
  location_id bigint NOT NULL,
  balance bigint NOT NULL DEFAULT 0,
  credit bigint NOT NULL DEFAULT 0,
  recharge_amount bigint NOT NULL DEFAULT 20,
  recharge_threshold bigint NOT NULL DEFAULT 10,
  last_charged timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT current_timestamp(),
  updated_at timestamp with time zone,
  deleted_at timestamp with time zone,
  CONSTRAINT wallet_location_id_key UNIQUE (location_id),
  CONSTRAINT wallet_location_id_foreign FOREIGN KEY (location_id) REFERENCES locations (id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS wallet_usage (
  id bigserial PRIMARY KEY NOT NULL,
  wallet_id bigint NOT NULL,
  description text NOT NULL,
  category text NOT NULL,
  amount integer NOT NULL DEFAULT 0,
  event_id bigint NOT NULL DEFAULT 0,
  balance integer NOT NULL DEFAULT 0,
  recharge_threshold integer NOT NULL DEFAULT 0,
  activity_date date NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT current_timestamp(),
  updated_at timestamp with time zone,
  deleted_at timestamp with time zone,
  CONSTRAINT wallet_usage_wallet_id_foreign FOREIGN KEY (wallet_id) REFERENCES wallet (id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS integrations (
  id bigserial PRIMARY KEY NOT NULL,
  vendor_id bigint NOT NULL,
  service text NOT NULL,
  api_key text,
  secret_key text,
  access_token text,
  refresh_token text,
  integration_id text NOT NULL,
  additional_settings jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone DEFAULT current_timestamp(),
  updated_at timestamp with time zone,
  location_id bigint,
  CONSTRAINT unique_service_location UNIQUE (service, location_id),
  CONSTRAINT integrations_location_id_foreign FOREIGN KEY (location_id) REFERENCES locations (id) ON DELETE CASCADE,
  CONSTRAINT integrations_vendor_id_foreign FOREIGN KEY (vendor_id) REFERENCES vendors (id) ON DELETE CASCADE
);

-- Tables with dependencies on vendor_levels and vendor_rewards
CREATE TABLE IF NOT EXISTS vendor_claimed_rewards (
  id bigserial PRIMARY KEY NOT NULL,
  vendor_level_id bigint NOT NULL,
  reward_id bigint NOT NULL,
  claimed_at timestamp with time zone NOT NULL,
  CONSTRAINT vendor_claimed_rewards_reward_id_foreign FOREIGN KEY (reward_id) REFERENCES vendor_rewards (id) ON DELETE CASCADE,
  CONSTRAINT vendor_claimed_rewards_vendor_level_id_foreign FOREIGN KEY (vendor_level_id) REFERENCES vendor_levels (id) ON DELETE CASCADE
);

-- Tables with dependencies on wallet
CREATE TABLE IF NOT EXISTS wallet_usage (
  id bigserial PRIMARY KEY NOT NULL,
  wallet_id bigint NOT NULL,
  description text NOT NULL,
  category text NOT NULL,
  amount integer NOT NULL DEFAULT 0,
  event_id bigint NOT NULL DEFAULT 0,
  balance integer NOT NULL DEFAULT 0,
  recharge_threshold integer NOT NULL DEFAULT 0,
  activity_date date NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone,
  deleted_at timestamp with time zone,
  CONSTRAINT wallet_usage_wallet_id_foreign FOREIGN KEY (wallet_id) REFERENCES wallet (id) ON DELETE CASCADE
);

-- Tables with dependencies on programs
CREATE TABLE IF NOT EXISTS member_plans (
  id bigserial PRIMARY KEY NOT NULL,
  name character varying(255) NOT NULL,
  description character varying(255) NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone,
  deleted_at timestamp with time zone,
  family boolean NOT NULL DEFAULT false,
  program_id bigint,
  family_member_limit integer NOT NULL DEFAULT 0,
  contract_id bigint,
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
  allow_proration boolean NOT NULL DEFAULT false,
  archived boolean NOT NULL DEFAULT false,
  class_limit_threshold smallint,
  expire_interval plan_interval,
  expire_threshold smallint,
  CONSTRAINT member_plans_contract_id_foreign FOREIGN KEY (contract_id) REFERENCES contracts (id) ON DELETE CASCADE,
  CONSTRAINT member_plans_program_id_foreign FOREIGN KEY (program_id) REFERENCES programs (id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_member_plans_program_id ON member_plans (program_id);

-- Tables with dependencies on roles, users, and locations
CREATE TABLE IF NOT EXISTS staffs (
  id bigserial PRIMARY KEY NOT NULL,
  first_name text NOT NULL,
  last_name text NOT NULL,
  email text NOT NULL,
  phone text NOT NULL,
  avatar text,
  user_id bigint NOT NULL,
  role_id bigint,
  location_id bigint,
  created_at timestamp with time zone NOT NULL DEFAULT current_timestamp(),
  updated_at timestamp with time zone,
  deleted_at timestamp with time zone,
  CONSTRAINT staffs_location_id_foreign FOREIGN KEY (location_id) REFERENCES locations (id) ON DELETE CASCADE,
  CONSTRAINT staffs_role_id_foreign FOREIGN KEY (role_id) REFERENCES roles (id) ON DELETE SET NULL,
  CONSTRAINT staffs_user_id_foreign FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
);

-- Tables with dependencies on staffs and locations
CREATE TABLE IF NOT EXISTS staff_locations (
  staff_id bigint NOT NULL,
  location_id bigint NOT NULL,
  status staff_status NOT NULL DEFAULT 'active',
  CONSTRAINT staff_locations_pkey PRIMARY KEY (staff_id, location_id),
  CONSTRAINT staff_locations_staff_id_foreign FOREIGN KEY (staff_id) REFERENCES staffs (id) ON DELETE CASCADE,
  CONSTRAINT staff_locations_location_id_foreign FOREIGN KEY (location_id) REFERENCES locations (id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_staff_locations_staff_id ON staff_locations (staff_id);
CREATE INDEX IF NOT EXISTS idx_staff_locations_location_id ON staff_locations (location_id);

-- Tables with dependencies on programs and staffs
CREATE TABLE IF NOT EXISTS program_levels (
  id bigserial PRIMARY KEY NOT NULL,
  name text NOT NULL,
  capacity integer NOT NULL,
  min_age integer NOT NULL,
  max_age integer NOT NULL,
  program_id bigint NOT NULL,
  parent_id bigint,
  created_at timestamp with time zone NOT NULL DEFAULT current_timestamp(),
  updated_at timestamp with time zone,
  deleted_at timestamp with time zone,
  interval plan_interval NOT NULL DEFAULT 'week',
  interval_threshold smallint NOT NULL DEFAULT 1,
  instructor_id bigint,
  CONSTRAINT program_levels_instructor_id_fkey FOREIGN KEY (instructor_id) REFERENCES staffs (id) ON DELETE CASCADE,
  CONSTRAINT program_levels_parent_id_foreign FOREIGN KEY (parent_id) REFERENCES program_levels (id),
  CONSTRAINT program_levels_program_id_foreign FOREIGN KEY (program_id) REFERENCES programs (id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_program_levels_program_id ON program_levels (program_id);

CREATE TABLE IF NOT EXISTS program_sessions (
  id bigserial PRIMARY KEY NOT NULL,
  program_level_id bigint NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT current_timestamp(),
  updated_at timestamp with time zone,
  time time NOT NULL,
  duration smallint NOT NULL DEFAULT 0,
  day smallint NOT NULL DEFAULT 1 CHECK (day BETWEEN 1 AND 7),
  CONSTRAINT program_sessions_program_level_id_foreign FOREIGN KEY (program_level_id) REFERENCES program_levels (id) ON DELETE CASCADE,
  CONSTRAINT program_sessions_level_time_duration_unique UNIQUE (program_level_id, time, duration)
);

CREATE INDEX IF NOT EXISTS idx_program_sessions_program_level_id ON program_sessions (program_level_id);

-- Tables with dependencies on members and contracts
CREATE TABLE IF NOT EXISTS member_contracts (
  id bigserial PRIMARY KEY NOT NULL,
  member_id bigint NOT NULL,
  contract_id bigint NOT NULL,
  member_plan_id bigint,
  signed boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT current_timestamp(),
  updated_at timestamp with time zone,
  deleted_at timestamp with time zone,
  location_id bigint,
  variables jsonb NOT NULL DEFAULT '{}'::jsonb,
  signature text,
  CONSTRAINT member_contracts_contract_id_foreign FOREIGN KEY (contract_id) REFERENCES contracts (id) ON DELETE CASCADE,
  CONSTRAINT member_contracts_location_id_foreign FOREIGN KEY (location_id) REFERENCES locations (id) ON DELETE CASCADE,
  CONSTRAINT member_contracts_member_id_foreign FOREIGN KEY (member_id) REFERENCES members (id) ON DELETE CASCADE,
  CONSTRAINT member_contracts_member_plan_id_fkey FOREIGN KEY (member_plan_id) REFERENCES member_plans (id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_member_contracts_member_id ON member_contracts (member_id);

-- Tables with dependencies on members, member_plans, and program_levels
CREATE TABLE IF NOT EXISTS member_subscriptions (
  id bigserial PRIMARY KEY NOT NULL,
  payer_id bigint NOT NULL,
  beneficiary_id bigint NOT NULL,
  member_plan_id bigint,
  created_at timestamp with time zone NOT NULL DEFAULT current_timestamp(),
  updated_at timestamp with time zone,
  stripe_subscription_id text,
  status location_status NOT NULL DEFAULT 'incomplete',
  current_period_start timestamp with time zone,
  start_date timestamp with time zone NOT NULL,
  current_period_end timestamp with time zone,
  cancel_at timestamp with time zone,
  cancel_at_period_end boolean NOT NULL DEFAULT false,
  location_id bigint,
  trial_end timestamp with time zone,
  ended_at timestamp with time zone,
  payment_method payment_method NOT NULL DEFAULT 'card',
  metadata jsonb NOT NULL DEFAULT '{}',
  program_level_id bigint,
  member_contract_id bigint,
  CONSTRAINT member_payments_member_plan_id_fkey FOREIGN KEY (member_plan_id) REFERENCES member_plans (id) ON DELETE SET NULL,
  CONSTRAINT member_payments_payer_id_foreign FOREIGN KEY (payer_id) REFERENCES members (id) ON DELETE CASCADE,
  CONSTRAINT member_subscriptions_location_id_fkey FOREIGN KEY (location_id) REFERENCES locations (id) ON DELETE CASCADE,
  CONSTRAINT member_subscriptions_member_contract_id_fkey FOREIGN KEY (member_contract_id) REFERENCES member_contracts (id),
  CONSTRAINT member_subscriptions_program_level_id_fkey FOREIGN KEY (program_level_id) REFERENCES program_levels (id),
  CONSTRAINT member_payments_beneficiary_id_foreign FOREIGN KEY (beneficiary_id) REFERENCES members (id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_member_subscriptions_payer_id ON member_subscriptions (payer_id);
CREATE INDEX IF NOT EXISTS idx_member_subscriptions_beneficiary_id ON member_subscriptions (beneficiary_id);
CREATE INDEX IF NOT EXISTS idx_member_subscriptions_location_id ON member_subscriptions (location_id);
CREATE INDEX IF NOT EXISTS idx_member_subscriptions_status ON member_subscriptions (status);

-- Tables with dependencies on members, member_plans, and program_levels
CREATE TABLE IF NOT EXISTS member_packages (
  id bigserial PRIMARY KEY NOT NULL,
  member_plan_id bigint NOT NULL,
  payer_id bigint,
  beneficiary_id bigint NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT current_timestamp(),
  updated_at timestamp with time zone,
  status package_status NOT NULL DEFAULT 'incomplete',
  start_date timestamp with time zone NOT NULL,
  payment_method payment_method,
  metadata jsonb DEFAULT '{}'::jsonb,
  total_class_attended integer NOT NULL DEFAULT 0,
  total_class_limit integer NOT NULL DEFAULT 0,
  expire_date timestamp with time zone,
  location_id bigint NOT NULL,
  program_level_id bigint,
  member_contract_id bigint,
  CONSTRAINT member_packages_location_id_fkey FOREIGN KEY (location_id) REFERENCES locations (id) ON DELETE CASCADE,
  CONSTRAINT member_packages_member_contract_id_fkey FOREIGN KEY (member_contract_id) REFERENCES member_contracts (id),
  CONSTRAINT member_packages_beneficiary_id_fkey FOREIGN KEY (beneficiary_id) REFERENCES members (id) ON DELETE CASCADE,
  CONSTRAINT member_packages_payer_id_fkey FOREIGN KEY (payer_id) REFERENCES members (id) ON DELETE SET NULL,
  CONSTRAINT member_packages_program_level_id_fkey FOREIGN KEY (program_level_id) REFERENCES program_levels (id),
  CONSTRAINT member_packages_member_plan_id_fkey FOREIGN KEY (member_plan_id) REFERENCES member_plans (id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_payer_id ON member_packages USING btree (payer_id);
CREATE INDEX IF NOT EXISTS idx_beneficiary_id ON member_packages USING btree (beneficiary_id);
CREATE INDEX IF NOT EXISTS idx_member_packages_location_id ON member_packages (location_id);
CREATE INDEX IF NOT EXISTS idx_member_packages_status ON member_packages (status);

-- Tables with dependencies on members, locations, and member_subscriptions/packages
CREATE TABLE IF NOT EXISTS member_invoices (
  id bigserial PRIMARY KEY NOT NULL,
  settings jsonb DEFAULT '{}'::jsonb,
  currency text,
  member_id bigint NOT NULL,
  location_id bigint NOT NULL,
  description text,
  items jsonb[] DEFAULT '{}'::jsonb[],
  paid boolean NOT NULL DEFAULT false,
  tax integer NOT NULL CHECK (tax >= 0),
  total bigint NOT NULL CHECK (total >= 0),
  discount bigint NOT NULL CHECK (discount >= 0),
  subtotal bigint NOT NULL CHECK (subtotal >= 0),
  due_date timestamp with time zone NOT NULL DEFAULT current_timestamp(),
  attempt_count integer NOT NULL DEFAULT 0,
  invoice_pdf text,
  status invoice_status NOT NULL DEFAULT 'draft',
  created_at timestamp with time zone NOT NULL DEFAULT current_timestamp(),
  updated_at timestamp with time zone NOT NULL DEFAULT current_timestamp(),
  member_subscription_id bigint,
  member_package_id bigint,
  for_period_start timestamp with time zone,
  for_period_end timestamp with time zone,
  CONSTRAINT member_invoices_location_id_fkey FOREIGN KEY (location_id) 
    REFERENCES locations (id) ON DELETE CASCADE,
  CONSTRAINT member_invoices_member_id_fkey FOREIGN KEY (member_id) 
    REFERENCES members (id) ON DELETE CASCADE,
  CONSTRAINT member_invoices_member_package_id_fkey FOREIGN KEY (member_package_id) 
    REFERENCES member_packages (id) ON DELETE CASCADE,
  CONSTRAINT member_invoices_member_subscription_id_fkey FOREIGN KEY (member_subscription_id) 
    REFERENCES member_subscriptions (id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_member_invoices_member_id ON member_invoices (member_id);
CREATE INDEX IF NOT EXISTS idx_member_invoices_location_id ON member_invoices (location_id);
CREATE INDEX IF NOT EXISTS idx_member_invoices_status ON member_invoices (status);

CREATE TABLE IF NOT EXISTS reservations (
  id bigserial PRIMARY KEY NOT NULL,
  session_id bigint NOT NULL,
  status reservation_status NOT NULL DEFAULT 'active',
  created_at timestamp with time zone NOT NULL DEFAULT current_timestamp(),
  updated_at timestamp with time zone,
  location_id bigint NOT NULL,
  expired_on timestamp with time zone,
  member_subscription_id bigint,
  canceled_on timestamp with time zone,
  member_package_id bigint,
  member_id bigint NOT NULL,
  CONSTRAINT reservations_location_id_fkey FOREIGN KEY (location_id) REFERENCES locations (id) ON DELETE CASCADE,
  CONSTRAINT reservations_member_id_fkey FOREIGN KEY (member_id) REFERENCES members (id) ON DELETE CASCADE,
  CONSTRAINT reservations_member_package_id_fkey FOREIGN KEY (member_package_id) REFERENCES member_packages (id) ON DELETE CASCADE,
  CONSTRAINT reservations_member_subscription_id_fkey FOREIGN KEY (member_subscription_id) REFERENCES member_subscriptions (id) ON DELETE CASCADE,
  CONSTRAINT reservations_session_id_foreign FOREIGN KEY (session_id) REFERENCES program_sessions (id) ON DELETE CASCADE,
  CONSTRAINT reservations_session_member_location_unique UNIQUE (session_id, member_id, location_id)
);

CREATE INDEX IF NOT EXISTS idx_reservations_member_id ON reservations (member_id);
CREATE INDEX IF NOT EXISTS idx_reservations_location_id ON reservations (location_id);
CREATE INDEX IF NOT EXISTS idx_reservations_session_id ON reservations (session_id);
CREATE INDEX IF NOT EXISTS idx_reservations_status ON reservations (status);

CREATE TABLE IF NOT EXISTS members (
  id bigserial PRIMARY KEY NOT NULL,
  user_id bigint NOT NULL,
  email text NOT NULL,
  phone text,
  referral_code text,
  current_points integer DEFAULT 0,
  avatar text,
  created_at timestamp with time zone NOT NULL DEFAULT current_timestamp(),
  updated_at timestamp with time zone,
  deleted_at timestamp with time zone,
  first_name text,
  last_name text,
  gender text,
  dob date,
  CONSTRAINT members_user_id_foreign FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
  CONSTRAINT members_email_unique UNIQUE (email),
  CONSTRAINT members_referral_code_unique UNIQUE (referral_code)
);

CREATE INDEX IF NOT EXISTS idx_members_email ON members (email);
CREATE INDEX IF NOT EXISTS idx_members_user_id ON members (user_id);

CREATE TABLE IF NOT EXISTS permissions (
  id bigserial PRIMARY KEY NOT NULL,
  name text NOT NULL,
  guard_name text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT current_timestamp(),
  updated_at timestamp with time zone ,
  description text,
  CONSTRAINT permissions_name_guard_name_unique UNIQUE (name, guard_name)
);

CREATE TABLE IF NOT EXISTS program_levels (
  id bigserial PRIMARY KEY NOT NULL,
  name text NOT NULL,
  capacity integer NOT NULL,
  min_age integer NOT NULL,
  max_age integer NOT NULL,
  program_id bigint NOT NULL,
  parent_id bigint,
  created_at timestamp with time zone NOT NULL DEFAULT current_timestamp(),
  updated_at timestamp with time zone,
  deleted_at timestamp with time zone,
  interval plan_interval NOT NULL DEFAULT 'week',
  interval_threshold smallint NOT NULL DEFAULT 1,
  instructor_id bigint,
  CONSTRAINT program_levels_instructor_id_fkey FOREIGN KEY (instructor_id) REFERENCES staffs (id) ON DELETE CASCADE,
  CONSTRAINT program_levels_parent_id_foreign FOREIGN KEY (parent_id) REFERENCES program_levels (id),
  CONSTRAINT program_levels_program_id_foreign FOREIGN KEY (program_id) REFERENCES programs (id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_program_levels_program_id ON program_levels (program_id);

CREATE TABLE IF NOT EXISTS program_sessions (
  id bigserial PRIMARY KEY NOT NULL,
  program_level_id bigint NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT current_timestamp(),
  updated_at timestamp with time zone,
  time time NOT NULL,
  duration smallint NOT NULL DEFAULT 0,
  day smallint NOT NULL DEFAULT 1 CHECK (day BETWEEN 1 AND 7),
  CONSTRAINT program_sessions_program_level_id_foreign FOREIGN KEY (program_level_id) REFERENCES program_levels (id) ON DELETE CASCADE,
  CONSTRAINT program_sessions_level_time_duration_unique UNIQUE (program_level_id, time, duration)
);

CREATE INDEX IF NOT EXISTS idx_program_sessions_program_level_id ON program_sessions (program_level_id);

CREATE TABLE IF NOT EXISTS programs (
  id bigserial PRIMARY KEY NOT NULL,
  location_id bigint NOT NULL,
  name text NOT NULL,
  description text NOT NULL,
  icon text,
  created_at timestamp with time zone NOT NULL DEFAULT current_timestamp(),
  updated_at timestamp with time zone,
  deleted_at timestamp with time zone,
  CONSTRAINT programs_location_id_foreign FOREIGN KEY (location_id) REFERENCES locations (id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_programs_location_id ON programs (location_id);

CREATE TABLE IF NOT EXISTS reservations (
  id bigserial PRIMARY KEY NOT NULL,
  session_id bigint NOT NULL,
  status reservation_status NOT NULL DEFAULT 'active',
  created_at timestamp with time zone NOT NULL DEFAULT current_timestamp(),
  updated_at timestamp with time zone,
  location_id bigint NOT NULL,
  expired_on timestamp with time zone,
  member_subscription_id bigint,
  canceled_on timestamp with time zone,
  member_package_id bigint,
  member_id bigint NOT NULL,
  CONSTRAINT reservations_location_id_foreign FOREIGN KEY (location_id) REFERENCES locations (id) ON DELETE CASCADE,
  CONSTRAINT reservations_member_id_foreign FOREIGN KEY (member_id) REFERENCES members (id) ON DELETE CASCADE,
  CONSTRAINT reservations_member_package_id_foreign FOREIGN KEY (member_package_id) REFERENCES member_packages (id) ON DELETE CASCADE,
  CONSTRAINT reservations_member_subscription_id_foreign FOREIGN KEY (member_subscription_id) REFERENCES member_subscriptions (id) ON DELETE CASCADE,
  CONSTRAINT reservations_session_id_foreign FOREIGN KEY (session_id) REFERENCES program_sessions (id) ON DELETE CASCADE,
  CONSTRAINT reservations_member_session_unique UNIQUE (member_id, session_id)
);

CREATE INDEX IF NOT EXISTS idx_reservations_member_id ON reservations (member_id);
CREATE INDEX IF NOT EXISTS idx_reservations_session_id ON reservations (session_id);
CREATE INDEX IF NOT EXISTS idx_reservations_status ON reservations (status);

CREATE TABLE IF NOT EXISTS reward_claims (
  id bigserial PRIMARY KEY NOT NULL,
  reward_id bigint NOT NULL,
  member_id bigint NOT NULL,
  previous_points integer,
  date_claimed timestamp with time zone,
  status smallint NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT current_timestamp(),
  updated_at timestamp with time zone,
  deleted_at timestamp with time zone,
  CONSTRAINT reward_claims_member_id_foreign FOREIGN KEY (member_id) REFERENCES members (id),
  CONSTRAINT reward_claims_reward_id_foreign FOREIGN KEY (reward_id) REFERENCES rewards (id)
);

CREATE TABLE IF NOT EXISTS rewards (
  id bigserial PRIMARY KEY NOT NULL,
  name text NOT NULL,
  description text NOT NULL,
  location_id bigint NOT NULL,
  icon text,
  required_points integer NOT NULL,
  limit_per_member integer NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT current_timestamp(),
  updated_at timestamp with time zone,
  limit_total text NOT NULL DEFAULT 'unlimited',
  images text[] NOT NULL DEFAULT '{}',
  CONSTRAINT rewards_location_id_foreign FOREIGN KEY (location_id) REFERENCES locations (id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS role_has_permissions (
  permission_id bigint NOT NULL,
  role_id bigint NOT NULL,
  CONSTRAINT role_has_permissions_pkey PRIMARY KEY (permission_id, role_id),
  CONSTRAINT role_has_permissions_permission_id_foreign FOREIGN KEY (permission_id) REFERENCES permissions (id) ON DELETE CASCADE,
  CONSTRAINT role_has_permissions_role_id_foreign FOREIGN KEY (role_id) REFERENCES roles (id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS roles (
  id bigserial PRIMARY KEY NOT NULL,
  name text NOT NULL,
  guard_name text NOT NULL,
  created_at timestamp with time zone DEFAULT current_timestamp(),
  updated_at timestamp with time zone,
  location_id bigint,
  color role_color,
  CONSTRAINT roles_name_guard_name_unique UNIQUE (name, guard_name),
  CONSTRAINT roles_location_id_foreign FOREIGN KEY (location_id) REFERENCES locations (id)
);

CREATE TABLE IF NOT EXISTS sessions (
  id bigserial PRIMARY KEY NOT NULL,
  session_token text NOT NULL,
  user_id bigint NOT NULL,
  expires timestamp with time zone NOT NULL,
  ip_address text NOT NULL,
  browser_id text NOT NULL,
  machine_id text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT current_timestamp(),
  updated_at timestamp with time zone,
  CONSTRAINT sessions_user_id_foreign FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions (user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_session_token ON sessions (session_token);

CREATE TABLE IF NOT EXISTS staffs (
  id bigserial PRIMARY KEY NOT NULL,
  first_name text NOT NULL,
  last_name text NOT NULL,
  email text NOT NULL,
  phone text NOT NULL,
  avatar text,
  user_id bigint NOT NULL,
  role_id bigint,
  location_id bigint,
  created_at timestamp with time zone NOT NULL DEFAULT current_timestamp(),
  updated_at timestamp with time zone,
  deleted_at timestamp with time zone,
  CONSTRAINT staffs_location_id_foreign FOREIGN KEY (location_id) REFERENCES locations (id) ON DELETE CASCADE,
  CONSTRAINT staffs_role_id_foreign FOREIGN KEY (role_id) REFERENCES roles (id) ON DELETE SET NULL,
  CONSTRAINT staffs_user_id_foreign FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
);


CREATE TABLE IF NOT EXISTS staff_locations (
  staff_id bigint NOT NULL,
  location_id bigint NOT NULL,
  status staff_status NOT NULL DEFAULT 'active',
  CONSTRAINT staff_locations_staff_id_foreign FOREIGN KEY (staff_id) REFERENCES staffs (id) ON DELETE CASCADE,
  CONSTRAINT staff_locations_location_id_foreign FOREIGN KEY (location_id) REFERENCES locations (id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_staff_locations_staff_id ON staff_locations (staff_id);
CREATE INDEX IF NOT EXISTS idx_staff_locations_location_id ON staff_locations (location_id);

CREATE TABLE IF NOT EXISTS transactions (
  id bigserial PRIMARY KEY NOT NULL,
  description text,
  payment_method payment_method NOT NULL,
  transaction_type text NOT NULL,
  amount integer NOT NULL,
  status transaction_status NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT current_timestamp(),
  updated_at timestamp with time zone,
  deleted_at timestamp with time zone,
  location_id bigint NOT NULL,
  member_id bigint,
  payment_type plan_type NOT NULL DEFAULT 'one-time',
  item text,
  charge_date timestamp with time zone DEFAULT current_timestamp(),
  currency text NOT NULL DEFAULT 'USD',
  metadata jsonb NOT NULL DEFAULT '{}',
  refunded boolean NOT NULL DEFAULT false,
  invoice_id bigint,
  subscription_id bigint,
  package_id bigint,
  CONSTRAINT transactions_location_id_foreign FOREIGN KEY (location_id) REFERENCES locations (id) ON DELETE CASCADE,
  CONSTRAINT transactions_member_id_foreign FOREIGN KEY (member_id) REFERENCES members (id) ON DELETE CASCADE,
  CONSTRAINT transactions_invoice_id_fkey FOREIGN KEY (invoice_id) REFERENCES member_invoices (id),
  CONSTRAINT transactions_subscription_id_fkey FOREIGN KEY (subscription_id) REFERENCES member_subscriptions (id) ON DELETE CASCADE,
  CONSTRAINT transactions_package_id_fkey FOREIGN KEY (package_id) REFERENCES member_packages (id) ON DELETE CASCADE,
  CONSTRAINT transactions_invoice_id_key UNIQUE (invoice_id),
  CONSTRAINT transactions_transaction_type_check CHECK (    transaction_type IN ('incoming', 'refund', 'pending') )
);


CREATE TABLE IF NOT EXISTS support_tickets (
  id bigserial PRIMARY KEY NOT NULL,
  subject text NOT NULL,
  issue text NOT NULL,
  video text,
  account_id text NOT NULL,
  description text,
  status support_ticket_status NOT NULL DEFAULT 'open',
  location_id bigint NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT current_timestamp(),
  updated_at timestamp with time zone,
  deleted_at timestamp with time zone,
  CONSTRAINT support_tickets_location_id_foreign FOREIGN KEY (location_id) REFERENCES locations (id)
);

CREATE INDEX IF NOT EXISTS idx_support_tickets_location_id ON support_tickets (location_id);

CREATE TABLE IF NOT EXISTS vendors (
  id bigserial PRIMARY KEY NOT NULL,
  first_name text NOT NULL,
  last_name text,
  user_id bigint NOT NULL,
  stripe_customer_id text,
  email text NOT NULL,
  icon text,
  phone_number text,
  created_at timestamp with time zone NOT NULL DEFAULT current_timestamp(),
  updated_at timestamp with time zone,
  deleted_at timestamp with time zone,
  CONSTRAINT vendors_email_unique UNIQUE (email),
  CONSTRAINT vendors_user_id_foreign FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_vendors_email ON vendors (email);
CREATE INDEX IF NOT EXISTS idx_vendors_user_id ON vendors (user_id);


CREATE TABLE IF NOT EXISTS vendor_progress (
  id bigserial PRIMARY KEY NOT NULL,
  vendor_id bigint,
  location_id bigint NOT NULL,
  points integer NOT NULL DEFAULT 0,
  total_points integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT current_timestamp(),
  updated_at timestamp with time zone,
  CONSTRAINT vendor_progress_location_id_fkey FOREIGN KEY (location_id) REFERENCES locations (id) ON DELETE CASCADE,
  CONSTRAINT vendor_progress_vendor_id_fkey FOREIGN KEY (vendor_id) REFERENCES vendors (id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS vendor_badges (
  id bigserial PRIMARY KEY NOT NULL,
  vendor_progress_id bigint NOT NULL,
  badge_id bigint NOT NULL,
  progress integer NOT NULL,
  completed boolean NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT current_timestamp(),
  claimed_at timestamp with time zone,
  CONSTRAINT vendor_badges_vendor_progress_id_foreign FOREIGN KEY (vendor_progress_id) REFERENCES vendor_progress (id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS vendor_rewards (
  id bigserial PRIMARY KEY NOT NULL,
  name text NOT NULL,
  description text NOT NULL,
  images text NOT NULL,
  meta jsonb NOT NULL,
  required_points integer NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT current_timestamp(),
  updated_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS vendor_levels (
  id bigserial PRIMARY KEY NOT NULL,
  vendor_id bigint,
  location_id bigint NOT NULL,
  points integer NOT NULL DEFAULT 0,
  total_points integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT current_timestamp(),
  updated_at timestamp with time zone,
  CONSTRAINT vendor_levels_location_id_foreign FOREIGN KEY (location_id) REFERENCES locations (id) ON DELETE CASCADE,
  CONSTRAINT vendor_levels_vendor_id_foreign FOREIGN KEY (vendor_id) REFERENCES vendors (id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS vendor_claimed_rewards (
  id bigserial PRIMARY KEY NOT NULL,
  vendor_level_id bigint NOT NULL,
  reward_id bigint NOT NULL,
  claimed_at timestamp with time zone NOT NULL,
  CONSTRAINT vendor_claimed_rewards_reward_id_foreign FOREIGN KEY (reward_id) REFERENCES vendor_rewards (id) ON DELETE CASCADE,
  CONSTRAINT vendor_claimed_rewards_vendor_level_id_foreign FOREIGN KEY (vendor_level_id) REFERENCES vendor_levels (id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS vendor_referrals (
  id bigserial PRIMARY KEY NOT NULL,
  amount integer NOT NULL,
  vendor_id bigint NOT NULL,
  referral_id bigint NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT current_timestamp(),
  accepted_at timestamp with time zone,
  CONSTRAINT vendor_referrals_vendor_id_foreign FOREIGN KEY (vendor_id) REFERENCES vendors (id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS wallet (
  id bigserial PRIMARY KEY NOT NULL,
  location_id bigint NOT NULL,
  balance bigint NOT NULL DEFAULT 0,
  credit bigint NOT NULL DEFAULT 0,
  recharge_amount bigint NOT NULL DEFAULT 20,
  recharge_threshold bigint NOT NULL DEFAULT 10,
  last_charged timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT current_timestamp(),
  updated_at timestamp with time zone,
  deleted_at timestamp with time zone,
  CONSTRAINT wallet_location_id_key UNIQUE (location_id),
  CONSTRAINT wallet_location_id_foreign FOREIGN KEY (location_id) REFERENCES locations (id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS wallet_usage (
  id bigserial PRIMARY KEY NOT NULL,
  wallet_id bigint NOT NULL,
  description text NOT NULL,
  category text NOT NULL,
  amount integer NOT NULL DEFAULT 0,
  event_id bigint NOT NULL DEFAULT 0,
  balance integer NOT NULL DEFAULT 0,
  recharge_threshold integer NOT NULL DEFAULT 0,
  activity_date date NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT current_timestamp(),
  updated_at timestamp with time zone,
  deleted_at timestamp with time zone,
  CONSTRAINT wallet_usage_wallet_id_foreign FOREIGN KEY (wallet_id) REFERENCES wallet (id) ON DELETE CASCADE
);