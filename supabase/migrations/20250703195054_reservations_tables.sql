



CREATE TABLE IF NOT EXISTS reservations (
  id text PRIMARY KEY NOT NULL DEFAULT uuid_base62('rsv_'),
  session_id text REFERENCES program_sessions (id) ON DELETE CASCADE NOT NULL,
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




CREATE TABLE IF NOT EXISTS recurring_reservations (
    id text PRIMARY KEY NOT NULL DEFAULT uuid_base62(),
    session_id text REFERENCES program_sessions (id) ON DELETE CASCADE NOT NULL,
    location_id text REFERENCES locations (id) ON DELETE CASCADE NOT NULL,
    member_id text REFERENCES members (id) ON DELETE CASCADE NOT NULL,
    start_date timestamp with time zone NOT NULL, 
    canceled_on  timestamp with time zone,
    member_subscription_id text REFERENCES member_subscriptions (id) ON DELETE CASCADE,
    member_package_id text REFERENCES member_packages (id) ON DELETE CASCADE,
    interval interval_type NOT NULL DEFAULT 'week',
    interval_threshold smallint NOT NULL DEFAULT 1,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone 
);

ALTER TABLE recurring_reservations
ADD CONSTRAINT unique_session_package_recurring UNIQUE (session_id, member_package_id),
ADD CONSTRAINT unique_session_subscription_recurring UNIQUE (session_id, member_subscription_id);

CREATE TABLE IF NOT EXISTS recurring_reservations_exceptions (
    recurring_reservation_id text REFERENCES recurring_reservations (id) ON DELETE CASCADE NOT NULL,
    occurrence_date date NOT NULL,
    CONSTRAINT unique_exception_recurring UNIQUE (recurring_reservation_id, occurrence_date)
);


CREATE TABLE IF NOT EXISTS check_ins (
  id text PRIMARY KEY NOT NULL DEFAULT uuid_base62('chk_'),
  reservation_id text REFERENCES reservations (id) ON DELETE CASCADE NOT NULL,
  recurring_id text REFERENCES recurring_reservations (id) ON DELETE CASCADE,
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

