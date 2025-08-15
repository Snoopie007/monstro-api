
CREATE TABLE IF NOT EXISTS achievements (
  id text PRIMARY KEY NOT NULL DEFAULT uuid_base62('ach_'),
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
  id serial PRIMARY KEY UNIQUE NOT NULL,
  name text NOT NULL
);

CREATE TABLE IF NOT EXISTS triggered_achievements (
  trigger_id integer REFERENCES achievement_triggers (id) ON DELETE CASCADE NOT NULL,
  achievement_id text REFERENCES achievements (id) ON DELETE CASCADE NOT NULL,
  weight integer NOT NULL,
  time_period integer,
  time_period_unit interval_type,
  member_plan_id text REFERENCES member_plans (id) ON DELETE CASCADE
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



CREATE TABLE IF NOT EXISTS rewards (
  id text PRIMARY KEY NOT NULL DEFAULT uuid_base62(),
  name text NOT NULL,
  description text NOT NULL,
  location_id text NOT NULL,
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
  reward_id text NOT NULL REFERENCES rewards (id) ON DELETE CASCADE,
  member_id text NOT NULL REFERENCES members (id) ON DELETE CASCADE,
  location_id text NOT NULL REFERENCES locations (id) ON DELETE CASCADE,
  previous_points integer,
  date_claimed timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS member_points_history (
    id text PRIMARY KEY NOT NULL DEFAULT uuid_base62(),
    location_id text REFERENCES locations (id) ON DELETE CASCADE NOT NULL,
    member_id text REFERENCES members (id) ON DELETE CASCADE NOT NULL,
    points bigint NOT NULL DEFAULT 0,
    achievement_id text REFERENCES achievements (id) ON DELETE CASCADE,
    type text NOT NULL,
    removed boolean NOT NULL DEFAULT false,
    removed_reason text,
    removed_on timestamp with time zone,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone
);
