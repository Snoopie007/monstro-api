
CREATE TABLE IF NOT EXISTS member_referrals (
  member_id text REFERENCES members (id) ON DELETE CASCADE NOT NULL,
  referred_member_id text REFERENCES members (id) ON DELETE CASCADE NOT NULL,
  location_id text REFERENCES locations (id) ON DELETE CASCADE NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone,
  CONSTRAINT member_referrals_pkey PRIMARY KEY (member_id, referred_member_id, location_id),
  CONSTRAINT member_referrals_unique UNIQUE (member_id, referred_member_id, location_id)
);