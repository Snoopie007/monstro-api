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

CREATE INDEX IF NOT EXISTS member_points_history_member_id_idx ON member_points_history(member_id);
CREATE INDEX IF NOT EXISTS member_points_history_location_id_idx ON member_points_history(location_id);
CREATE INDEX IF NOT EXISTS member_points_history_achievement_id_idx ON member_points_history(achievement_id);
CREATE INDEX IF NOT EXISTS member_points_history_created_at_idx ON member_points_history(created_at);

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

CREATE INDEX IF NOT EXISTS support_plans_vendor_id_idx ON support_plans(vendor_id);
CREATE INDEX IF NOT EXISTS support_plans_created_at_idx ON support_plans(created_at);

