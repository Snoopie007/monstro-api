

CREATE TABLE IF NOT EXISTS recurring_reservations (
    id text PRIMARY KEY NOT NULL DEFAULT uuid_base62(),
    session_id text REFERENCES program_sessions (id) ON DELETE CASCADE NOT NULL,
    location_id text REFERENCES locations (id) ON DELETE CASCADE NOT NULL,
    member_id text REFERENCES members (id) ON DELETE CASCADE NOT NULL,
    start_date timestamp with time zone NOT NULL, 
    canceled_on  timestamp with time zone,
    member_subscription_id text REFERENCES member_subscriptions (id) ON DELETE CASCADE,
    member_package_id text REFERENCES member_packages (id) ON DELETE CASCADE,
    interval plan_interval NOT NULL DEFAULT 'week',
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

ALTER TABLE check_ins
ADD COLUMN recurring_id text REFERENCES recurring_reservations (id) ON DELETE CASCADE;


