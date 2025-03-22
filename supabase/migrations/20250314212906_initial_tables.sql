-- Create ENUM types
CREATE TYPE contract_type AS ENUM('contract', 'waiver');
CREATE TYPE invoice_status AS ENUM('draft', 'paid', 'unpaid', 'uncollectible', 'void');
CREATE TYPE location_status AS ENUM('incomplete', 'active', 'past_due', 'canceled', 'paused', 'trialing', 'unpaid', 'incomplete_expired');
CREATE TYPE relationship AS ENUM('parent', 'spouse', 'child', 'sibling', 'other');
CREATE TYPE package_status AS ENUM('active', 'incomplete', 'expired', 'completed');
CREATE TYPE payment_method AS ENUM('card', 'cash', 'check', 'zelle', 'venmo', 'paypal', 'apple', 'google');
CREATE TYPE plan_interval AS ENUM('day', 'week', 'month', 'year');
CREATE TYPE plan_type AS ENUM('recurring', 'one-time');
CREATE TYPE reservation_status AS ENUM('active', 'expired', 'canceled');
CREATE TYPE role_color AS ENUM('red', 'green', 'blue', 'pink', 'cyan', 'lime', 'orange', 'fuchsia', 'sky', 'lemon', 'purple', 'yellow');
CREATE TYPE transaction_status AS ENUM('paid', 'failed', 'incomplete');
CREATE TYPE staff_status AS ENUM('active', 'inactive');
CREATE TYPE support_ticket_status AS ENUM('open', 'updated', 'closed');
CREATE TYPE program_status AS ENUM('active', 'inactive');


-- Base tables with no foreign key dependencies
CREATE TABLE IF NOT EXISTS users (
  id bigserial PRIMARY KEY NOT NULL,
  name text NOT NULL,
  email text NOT NULL UNIQUE,
  email_verified_at timestamp with time zone,
  image text,
  password text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone,
  deleted_at timestamp with time zone,
  CONSTRAINT users_email_unique UNIQUE (email)
);


CREATE TABLE IF NOT EXISTS account (
  user_id bigint,
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
  CONSTRAINT account_pkey PRIMARY KEY (provider, provider_account_id),
  CONSTRAINT account_user_id_foreign FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users (email);
-- Tables with dependencies on users
CREATE TABLE IF NOT EXISTS vendors (
  id bigserial PRIMARY KEY NOT NULL,
  first_name text NOT NULL,
  last_name text,
  user_id bigint NOT NULL,
  stripe_customer_id text,
  email text NOT NULL,
  avatar text,
  phone text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
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
  created_at timestamp with time zone NOT NULL DEFAULT now(),
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
  slug text NOT NULL,
  meta_data jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone,
  deleted_at timestamp with time zone,
  industry text,
  legal_name text,
  CONSTRAINT locations_address_key UNIQUE (address),
  CONSTRAINT locations_slug_unique UNIQUE (slug),
  CONSTRAINT locations_vendor_id_foreign FOREIGN KEY (vendor_id) REFERENCES vendors (id)
);

CREATE INDEX IF NOT EXISTS idx_locations_vendor_id ON locations (vendor_id);


-- Tables with dependencies on locations
CREATE TABLE IF NOT EXISTS contracts (
  id bigserial PRIMARY KEY NOT NULL,
  content text,
  title text NOT NULL,
  description text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone,
  deleted_at timestamp with time zone,
  is_draft boolean NOT NULL DEFAULT false,
  editable boolean NOT NULL DEFAULT true,
  location_id bigint NOT NULL,
  type contract_type NOT NULL DEFAULT 'contract'::contract_type,
  require_signature boolean NOT NULL DEFAULT false,
  CONSTRAINT contracts_location_id_fkey FOREIGN KEY (location_id) REFERENCES locations (id) ON UPDATE CASCADE ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS location_state (
  location_id bigint PRIMARY KEY NOT NULL,
  plan_id bigint,
  pkg_id bigint,
  payment_plan_id bigint,
  status location_status NOT NULL DEFAULT 'incomplete',
  agree_to_terms boolean NOT NULL DEFAULT false,
  last_renewal_date timestamp with time zone DEFAULT now(),
  start_date timestamp with time zone,
  settings jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone,
  usage_percent integer NOT NULL DEFAULT 0,
  waiver_id bigint,
  CONSTRAINT location_state_location_id_key UNIQUE (location_id),
  CONSTRAINT location_state_location_id_fkey FOREIGN KEY (location_id) REFERENCES locations (id) ON DELETE CASCADE,
  CONSTRAINT location_state_waiver_id_fkey FOREIGN KEY (waiver_id) REFERENCES contracts (id) ON DELETE SET NULL
);


CREATE TABLE IF NOT EXISTS sessions (
  id bigserial PRIMARY KEY NOT NULL,
  session_token text NOT NULL,
  user_id bigint NOT NULL,
  expires timestamp with time zone NOT NULL,
  ip_address text,
  browser_id text,
  machine_id text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone,
  CONSTRAINT sessions_user_id_foreign FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions (user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_session_token ON sessions (session_token);


CREATE TABLE IF NOT EXISTS roles (
  id bigserial PRIMARY KEY NOT NULL,
  name text NOT NULL,
  guard_name text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone,
  location_id bigint,
  color role_color,
  CONSTRAINT roles_name_guard_name_unique UNIQUE (name, guard_name),
  CONSTRAINT roles_location_id_foreign FOREIGN KEY (location_id) REFERENCES locations (id)
);


CREATE TABLE IF NOT EXISTS permissions (
  id bigserial PRIMARY KEY NOT NULL,
  name text NOT NULL,
  guard_name text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone,
  description text,
  CONSTRAINT permissions_name_guard_name_unique UNIQUE (name, guard_name)
);



-- Tables with dependencies on roles
CREATE TABLE IF NOT EXISTS role_has_permissions (
  permission_id bigint NOT NULL,
  role_id bigint NOT NULL,
  CONSTRAINT role_has_permissions_pkey PRIMARY KEY (permission_id, role_id),
  CONSTRAINT role_has_permissions_permission_id_foreign FOREIGN KEY (permission_id) REFERENCES permissions (id) ON DELETE CASCADE,
  CONSTRAINT role_has_permissions_role_id_foreign FOREIGN KEY (role_id) REFERENCES roles (id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS user_roles (
  user_id bigint NOT NULL,
  role_id bigint NOT NULL,
  CONSTRAINT user_roles_pkey PRIMARY KEY (user_id, role_id),
  CONSTRAINT user_roles_user_id_foreign FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
  CONSTRAINT user_roles_role_id_foreign FOREIGN KEY (role_id) REFERENCES roles (id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON user_roles (user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role_id ON user_roles (role_id);


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
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone,
  deleted_at timestamp with time zone,
  CONSTRAINT staffs_location_id_foreign FOREIGN KEY (location_id) REFERENCES locations (id) ON DELETE CASCADE,
  CONSTRAINT staffs_role_id_foreign FOREIGN KEY (role_id) REFERENCES roles (id) ON DELETE SET NULL,
  CONSTRAINT staffs_user_id_foreign FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS programs (
  id bigserial PRIMARY KEY NOT NULL,
  location_id bigint NOT NULL,
  instructor_id bigint,
  name text NOT NULL,
  description text NOT NULL,
  icon text,
  benefits text[] NOT NULL DEFAULT '{}',
  capacity integer NOT NULL,
  min_age integer NOT NULL,
  max_age integer NOT NULL,
  status program_status NOT NULL DEFAULT 'active',
  interval plan_interval NOT NULL DEFAULT 'week',
  interval_threshold smallint NOT NULL DEFAULT 1,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone,
  deleted_at timestamp with time zone,
  CONSTRAINT programs_location_id_foreign FOREIGN KEY (location_id) REFERENCES locations (id) ON DELETE CASCADE,
  CONSTRAINT programs_instructor_id_foreign FOREIGN KEY (instructor_id) REFERENCES staffs (id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_programs_location_id ON programs (location_id);

CREATE TABLE IF NOT EXISTS program_tags (
  id bigserial PRIMARY KEY NOT NULL,
  name text NOT NULL,
  CONSTRAINT program_tags_name_unique UNIQUE (name)
);

CREATE TABLE IF NOT EXISTS program_has_tags (
  program_id bigint NOT NULL,
  tag_id bigint NOT NULL,
  CONSTRAINT program_has_tags_program_id_foreign FOREIGN KEY (program_id) REFERENCES programs (id) ON DELETE CASCADE,
  CONSTRAINT program_has_tags_tag_id_foreign FOREIGN KEY (tag_id) REFERENCES program_tags (id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS program_sessions (
  id bigserial PRIMARY KEY NOT NULL,
  program_id bigint NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone,
  time time NOT NULL,
  duration smallint NOT NULL DEFAULT 0,
  day smallint NOT NULL DEFAULT 1 CHECK (day BETWEEN 1 AND 7),
  CONSTRAINT program_sessions_program_id_foreign FOREIGN KEY (program_id) REFERENCES programs (id) ON DELETE CASCADE,
  CONSTRAINT unique_program_session UNIQUE (program_id, day, time, duration)
);



CREATE INDEX IF NOT EXISTS idx_program_sessions_program_id ON program_sessions (program_id);

-- Tables with dependencies on members and locations
CREATE TABLE IF NOT EXISTS member_locations (
  location_id bigint NOT NULL,
  member_id bigint NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
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

CREATE TABLE IF NOT EXISTS family_members (
  id bigserial PRIMARY KEY NOT NULL,
  member_id bigint NOT NULL,
  related_member_id bigint NOT NULL,
  relationship relationship NOT NULL,
  is_payer boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone,
  deleted_at timestamp with time zone,
  CONSTRAINT family_members_member_id_foreign FOREIGN KEY (member_id) REFERENCES members (id) ON DELETE CASCADE,
  CONSTRAINT family_members_related_member_id_foreign FOREIGN KEY (related_member_id) REFERENCES members (id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_family_members_member_id ON family_members (member_id);
CREATE INDEX IF NOT EXISTS idx_family_members_related_member_id ON family_members (related_member_id);

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





-- Tables with dependencies on members and contracts
CREATE TABLE IF NOT EXISTS member_contracts (
  id bigserial PRIMARY KEY NOT NULL,
  member_id bigint NOT NULL,
  contract_id bigint NOT NULL,
  member_plan_id bigint,
  signed boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
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
  parent_id bigint,
  member_id bigint NOT NULL,
  member_plan_id bigint,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
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
  program_id bigint,
  member_contract_id bigint,
  is_participant boolean NOT NULL DEFAULT true,
  CONSTRAINT member_subscriptions_member_plan_id_fkey FOREIGN KEY (member_plan_id) REFERENCES member_plans (id) ON DELETE SET NULL,
  CONSTRAINT member_subscriptions_parent_id_foreign FOREIGN KEY (parent_id) REFERENCES member_subscriptions (id) ON DELETE CASCADE,
  CONSTRAINT member_subscriptions_location_id_fkey FOREIGN KEY (location_id) REFERENCES locations (id) ON DELETE CASCADE,
  CONSTRAINT member_subscriptions_member_contract_id_fkey FOREIGN KEY (member_contract_id) REFERENCES member_contracts (id),
  CONSTRAINT member_subscriptions_program_id_fkey FOREIGN KEY (program_id) REFERENCES programs (id),
  CONSTRAINT member_subscriptions_member_id_foreign FOREIGN KEY (member_id) REFERENCES members (id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_member_subscriptions_member_id ON member_subscriptions (member_id);
CREATE INDEX IF NOT EXISTS idx_member_subscriptions_location_id ON member_subscriptions (location_id);
CREATE INDEX IF NOT EXISTS idx_member_subscriptions_status ON member_subscriptions (status);

-- Tables with dependencies on members, member_plans, and program_levels
CREATE TABLE IF NOT EXISTS member_packages (
  id bigserial PRIMARY KEY NOT NULL,
  member_plan_id bigint NOT NULL,
  member_id bigint NOT NULL,
  parent_id bigint,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone,
  status package_status NOT NULL DEFAULT 'incomplete',
  start_date timestamp with time zone NOT NULL,
  payment_method payment_method,
  metadata jsonb DEFAULT '{}'::jsonb,
  total_class_attended integer NOT NULL DEFAULT 0,
  total_class_limit integer NOT NULL DEFAULT 0,
  expire_date timestamp with time zone,
  location_id bigint NOT NULL,
  program_id bigint,
  member_contract_id bigint,
  is_participant boolean NOT NULL DEFAULT true,
  CONSTRAINT member_packages_location_id_fkey FOREIGN KEY (location_id) REFERENCES locations (id) ON DELETE CASCADE,
  CONSTRAINT member_packages_member_contract_id_fkey FOREIGN KEY (member_contract_id) REFERENCES member_contracts (id),
  CONSTRAINT member_packages_member_id_fkey FOREIGN KEY (member_id) REFERENCES members (id) ON DELETE CASCADE,
  CONSTRAINT member_packages_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES member_packages (id) ON DELETE CASCADE,
  CONSTRAINT member_packages_program_id_fkey FOREIGN KEY (program_id) REFERENCES programs (id),
  CONSTRAINT member_packages_member_plan_id_fkey FOREIGN KEY (member_plan_id) REFERENCES member_plans (id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_member_packages_member_id ON member_packages (member_id);
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


CREATE TABLE IF NOT EXISTS transactions (
  id bigserial PRIMARY KEY NOT NULL,
  description text,
  payment_method payment_method NOT NULL,
  transaction_type text NOT NULL,
  amount integer NOT NULL,
  status transaction_status NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone,
  deleted_at timestamp with time zone,
  location_id bigint NOT NULL,
  member_id bigint,
  payment_type plan_type NOT NULL DEFAULT 'one-time',
  item text,
  charge_date timestamp with time zone DEFAULT now(),
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
  CONSTRAINT transactions_transaction_type_check CHECK (transaction_type IN ('incoming', 'refund', 'pending'))
);


CREATE TABLE IF NOT EXISTS reservations (
  id bigserial PRIMARY KEY NOT NULL,
  session_id bigint NOT NULL,
  status reservation_status NOT NULL DEFAULT 'active',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
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
  CONSTRAINT reservations_session_subscription_unique UNIQUE (session_id, member_id, location_id, member_subscription_id),
  CONSTRAINT reservations_session_package_unique UNIQUE (session_id, member_id, location_id, member_package_id)
);



CREATE INDEX IF NOT EXISTS idx_reservations_member_id ON reservations (member_id);
CREATE INDEX IF NOT EXISTS idx_reservations_location_id ON reservations (location_id);
CREATE INDEX IF NOT EXISTS idx_reservations_session_id ON reservations (session_id);
CREATE INDEX IF NOT EXISTS idx_reservations_status ON reservations (status);


CREATE TABLE IF NOT EXISTS check_ins (
  id bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  reservation_id bigint NOT NULL,
  start_time timestamp with time zone NOT NULL,
  check_in_time timestamp with time zone NOT NULL,
  check_out_time timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  deleted_at timestamp with time zone,
  end_time timestamp with time zone NOT NULL,
  ip_address inet,
  lat numeric,
  lng numeric,
  mac_address text,
  CONSTRAINT check_ins_reservation_id_foreign FOREIGN KEY (reservation_id) REFERENCES reservations (id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_check_ins_reservation_id ON check_ins (reservation_id);
CREATE INDEX IF NOT EXISTS idx_check_ins_check_in_time ON check_ins (check_in_time);


CREATE TABLE IF NOT EXISTS achievements (
  id bigserial PRIMARY KEY NOT NULL,
  title text NOT NULL,
  badge text NOT NULL,
  location_id bigint NOT NULL,
  points bigint NOT NULL,
  description text,
  icon text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone,
  CONSTRAINT achievements_location_id_foreign FOREIGN KEY (location_id) REFERENCES locations (id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS actions (
  id bigserial PRIMARY KEY NOT NULL,
  name text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS achievement_actions (
  id bigserial PRIMARY KEY NOT NULL,
  action_id bigint NOT NULL,
  achievement_id bigint NOT NULL,
  count integer NOT NULL,
  metadata text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone,
  CONSTRAINT achievement_actions_achievement_id_foreign FOREIGN KEY (achievement_id) REFERENCES achievements (id) ON DELETE CASCADE,
  CONSTRAINT achievement_actions_action_id_foreign FOREIGN KEY (action_id) REFERENCES actions (id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_achievement_actions_achievement_id ON achievement_actions (achievement_id);
CREATE INDEX IF NOT EXISTS idx_achievement_actions_action_id ON achievement_actions (action_id);



CREATE TABLE IF NOT EXISTS rewards (
  id bigserial PRIMARY KEY NOT NULL,
  name text NOT NULL,
  description text NOT NULL,
  location_id bigint NOT NULL,
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
  id bigserial PRIMARY KEY NOT NULL,
  reward_id bigint NOT NULL,
  member_id bigint NOT NULL,
  previous_points integer,
  date_claimed timestamp with time zone,
  status smallint NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone,
  deleted_at timestamp with time zone,
  CONSTRAINT reward_claims_member_id_foreign FOREIGN KEY (member_id) REFERENCES members (id),
  CONSTRAINT reward_claims_reward_id_foreign FOREIGN KEY (reward_id) REFERENCES rewards (id)
);



CREATE TABLE IF NOT EXISTS member_achievements (
  id bigserial PRIMARY KEY NOT NULL,
  achievement_id bigint NOT NULL,
  member_id bigint NOT NULL,
  location_id bigint NOT NULL,
  status text NOT NULL,
  note text,
  progress integer NOT NULL DEFAULT 0,
  date_achieved timestamp with time zone DEFAULT now(),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone,
  CONSTRAINT member_achievements_achievement_id_foreign FOREIGN KEY (achievement_id) REFERENCES achievements (id),
  CONSTRAINT member_achievements_member_id_foreign FOREIGN KEY (member_id) REFERENCES members (id),
  CONSTRAINT member_achievements_location_id_foreign FOREIGN KEY (location_id) REFERENCES locations (id)
);

CREATE TABLE IF NOT EXISTS member_referrals (
  id bigserial PRIMARY KEY NOT NULL,
  member_id bigint NOT NULL,
  referred_member_id bigint NOT NULL,
  location_id bigint NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone,
  CONSTRAINT member_referrals_location_id_foreign FOREIGN KEY (location_id) REFERENCES locations (id) ON DELETE CASCADE,
  CONSTRAINT member_referrals_member_id_foreign FOREIGN KEY (member_id) REFERENCES members (id) ON DELETE CASCADE,
  CONSTRAINT member_referrals_referred_member_id_foreign FOREIGN KEY (referred_member_id) REFERENCES members (id) ON DELETE CASCADE
);


CREATE TABLE IF NOT EXISTS integrations (
  id bigserial PRIMARY KEY NOT NULL,
  service text NOT NULL,
  api_key text,
  secret_key text,
  access_token text,
  refresh_token text,
  expires_at bigint,
  integration_id text NOT NULL,
  settings jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone,
  location_id bigint NOT NULL,
  CONSTRAINT unique_service_location UNIQUE (service, location_id),
  CONSTRAINT integrations_location_id_foreign FOREIGN KEY (location_id) REFERENCES locations (id) ON DELETE CASCADE
);

-- Tables with dependencies on vendors and locations
CREATE TABLE IF NOT EXISTS vendor_levels (
  id bigserial PRIMARY KEY NOT NULL,
  vendor_id bigint,
  location_id bigint NOT NULL,
  points integer NOT NULL DEFAULT 0,
  total_points integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone,
  CONSTRAINT vendor_levels_location_id_foreign FOREIGN KEY (location_id) REFERENCES locations (id) ON DELETE CASCADE,
  CONSTRAINT vendor_levels_vendor_id_foreign FOREIGN KEY (vendor_id) REFERENCES vendors (id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS vendor_badges (
  id bigserial PRIMARY KEY NOT NULL,
  vendor_level_id bigint NOT NULL,
  badge_id bigint NOT NULL, -- this is the badge id is hardcoded
  progress integer NOT NULL,
  completed boolean NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  claimed_at timestamp with time zone,
  CONSTRAINT vendor_badges_vendor_level_id_foreign FOREIGN KEY (vendor_level_id) REFERENCES vendor_levels (id) ON DELETE CASCADE
);


CREATE TABLE IF NOT EXISTS vendor_rewards (
  id bigserial PRIMARY KEY NOT NULL,
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
  created_at timestamp with time zone NOT NULL DEFAULT now(),
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
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone,
  deleted_at timestamp with time zone,
  CONSTRAINT wallet_location_id_key UNIQUE (location_id),
  CONSTRAINT wallet_location_id_foreign FOREIGN KEY (location_id) REFERENCES locations (id) ON DELETE CASCADE
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


CREATE TABLE IF NOT EXISTS support_tickets (
  id bigserial PRIMARY KEY NOT NULL,
  subject text NOT NULL,
  issue text NOT NULL,
  video text,
  account_id text NOT NULL,
  description text,
  status support_ticket_status NOT NULL DEFAULT 'open',
  location_id bigint NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone,
  deleted_at timestamp with time zone,
  CONSTRAINT support_tickets_location_id_foreign FOREIGN KEY (location_id) REFERENCES locations (id)
);

CREATE INDEX IF NOT EXISTS idx_support_tickets_location_id ON support_tickets (location_id);

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
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone,
  program_id bigint,
  plan_id bigint,
  processed boolean NOT NULL DEFAULT false,
  location_id bigint NOT NULL,
  CONSTRAINT import_members_location_id_fkey FOREIGN KEY (location_id) REFERENCES locations (id) ON DELETE CASCADE
);


-- Tables with dependencies on staffs and locations
CREATE TABLE IF NOT EXISTS staff_locations (
  id bigserial PRIMARY KEY NOT NULL,
  staff_id bigint NOT NULL,
  location_id bigint NOT NULL,
  status staff_status NOT NULL DEFAULT 'active',
  CONSTRAINT staff_locations_staff_id_foreign FOREIGN KEY (staff_id) REFERENCES staffs (id) ON DELETE CASCADE,
  CONSTRAINT staff_locations_location_id_foreign FOREIGN KEY (location_id) REFERENCES locations (id) ON DELETE CASCADE,
  CONSTRAINT staff_locations_staff_location_unique UNIQUE (staff_id, location_id)
);

CREATE INDEX IF NOT EXISTS idx_staff_locations_staff_id ON staff_locations (staff_id);
CREATE INDEX IF NOT EXISTS idx_staff_locations_location_id ON staff_locations (location_id);

CREATE TABLE IF NOT EXISTS staff_location_roles (
  staff_location_id bigint NOT NULL,
  role_id bigint NOT NULL,
  CONSTRAINT staff_location_roles_pkey PRIMARY KEY (staff_location_id, role_id),
  CONSTRAINT staff_location_roles_staff_location_fkey FOREIGN KEY (staff_location_id) REFERENCES staff_locations (id) ON DELETE CASCADE,
  CONSTRAINT staff_location_roles_role_id_fkey FOREIGN KEY (role_id) REFERENCES roles (id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_staff_location_roles_staff_location_id ON staff_location_roles (staff_location_id);
CREATE INDEX IF NOT EXISTS idx_staff_location_roles_role_id ON staff_location_roles (role_id);
