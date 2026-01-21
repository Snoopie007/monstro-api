CREATE TYPE plan_type AS ENUM('recurring', 'one-time');
CREATE TYPE package_status AS ENUM('active', 'incomplete', 'expired', 'completed');
CREATE TYPE subscription_status AS ENUM('incomplete', 'active', 'past_due', 'canceled', 'paused', 'trialing', 'unpaid', 'incomplete_expired');


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
  interval interval_type NOT NULL DEFAULT 'month',
  interval_threshold smallint NOT NULL DEFAULT 1,
  currency text NOT NULL DEFAULT 'USD',
  price bigint,
  editable boolean NOT NULL DEFAULT true,
  stripe_price_id text,
  total_class_limit integer,
  class_limit_interval text ,
  billing_anchor_config jsonb,
  marketing_details jsonb NOT NULL DEFAULT '{}'::jsonb,
  allow_proration boolean NOT NULL DEFAULT false,
  archived boolean NOT NULL DEFAULT false,
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
  status subscription_status NOT NULL DEFAULT 'incomplete',
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
  member_contract_id text REFERENCES member_contracts (id) ON DELETE SET NULL,
  is_participant boolean NOT NULL DEFAULT true
);

ALTER TABLE member_subscriptions ADD CONSTRAINT member_subs_parent_unique UNIQUE (parent_id, member_id);

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
  member_contract_id text REFERENCES member_contracts (id) ON DELETE SET NULL,
  is_participant boolean NOT NULL DEFAULT true
);

ALTER TABLE member_packages ADD CONSTRAINT member_packages_parent_unique UNIQUE (parent_id, member_id);

CREATE INDEX IF NOT EXISTS idx_member_packages_member_id ON member_packages (member_id);
CREATE INDEX IF NOT EXISTS idx_member_packages_location_id ON member_packages (location_id);
CREATE INDEX IF NOT EXISTS idx_member_packages_status ON member_packages (status);


CREATE TABLE IF NOT EXISTS plan_programs (
    plan_id text REFERENCES member_plans (id) ON DELETE CASCADE NOT NULL,
    program_id text REFERENCES programs (id) ON DELETE CASCADE NOT NULL,
    PRIMARY KEY (plan_id, program_id)
);

CREATE INDEX idx_plan_programs_plan_id ON plan_programs (plan_id);
CREATE INDEX idx_plan_programs_program_id ON plan_programs (program_id);







