

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