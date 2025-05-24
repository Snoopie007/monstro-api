CREATE TABLE IF NOT EXISTS member_points_history (
    id bigserial PRIMARY KEY NOT NULL,
    location_id bigint NOT NULL,
    member_id bigint NOT NULL,
    points bigint NOT NULL DEFAULT 0,
    achievement_id bigint,
    type text NOT NULL,
    removed boolean NOT NULL DEFAULT false,
    removed_reason text,
    removed_on timestamp with time zone,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone,
    CONSTRAINT member_points_location_id_fkey FOREIGN KEY (location_id) REFERENCES locations(id) ON DELETE CASCADE,
    CONSTRAINT member_points_member_id_fkey FOREIGN KEY (member_id) REFERENCES members(id) ON DELETE CASCADE,
    CONSTRAINT member_points_achievement_id_fkey FOREIGN KEY (achievement_id) REFERENCES achievements(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS member_points_history_member_id_idx ON member_points_history(member_id);
CREATE INDEX IF NOT EXISTS member_points_history_location_id_idx ON member_points_history(location_id);
CREATE INDEX IF NOT EXISTS member_points_history_achievement_id_idx ON member_points_history(achievement_id);
CREATE INDEX IF NOT EXISTS member_points_history_created_at_idx ON member_points_history(created_at);

CREATE TABLE IF NOT EXISTS support_plans (
    id bigserial PRIMARY KEY NOT NULL,
    vendor_id bigint NOT NULL,
    name text NOT NULL,
    price integer NOT NULL,
    support_calls boolean NOT NULL DEFAULT false,
    sessions_per_month integer NOT NULL DEFAULT 0,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone,
    CONSTRAINT support_plans_vendor_id_fkey FOREIGN KEY (vendor_id) REFERENCES vendors(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS support_plans_vendor_id_idx ON support_plans(vendor_id);
CREATE INDEX IF NOT EXISTS support_plans_created_at_idx ON support_plans(created_at);

ALTER TABLE member_referrals
DROP COLUMN id;

ALTER TABLE member_referrals
ADD CONSTRAINT member_referrals_pkey PRIMARY KEY (memberId, referredMemberId, locationId);

ALTER TABLE member_referrals
ADD CONSTRAINT unique_referred_member_location UNIQUE (referredMemberId, locationId, memberId);