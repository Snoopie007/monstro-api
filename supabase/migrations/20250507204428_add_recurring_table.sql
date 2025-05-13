ALTER TABLE reservations
DROP CONSTRAINT IF EXISTS unique_session_package_multi_session,
DROP CONSTRAINT IF EXISTS unique_session_subscription_multi_session;

ALTER TABLE reservations
DROP COLUMN status,
DROP COLUMN auto,
DROP COLUMN expired_on;

DROP TYPE IF EXISTS reservation_status;


CREATE TABLE IF NOT EXISTS recurring_reservations (
    id bigserial PRIMARY KEY NOT NULL,
    session_id bigint NOT NULL,
    location_id bigint NOT NULL,
    member_id bigint NOT NULL,
    start_date date NOT NULL, 
    canceled_on date,
    member_subscription_id bigint,
    member_package_id bigint,
    interval plan_interval NOT NULL DEFAULT 'week',
    interval_threshold smallint NOT NULL DEFAULT 1,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone 
);

ALTER TABLE recurring_reservations
ADD CONSTRAINT recurring_reservations_session_id_fkey FOREIGN KEY (session_id) REFERENCES program_sessions(id),
ADD CONSTRAINT recurring_reservations_location_id_fkey FOREIGN KEY (location_id) REFERENCES locations(id),
ADD CONSTRAINT recurring_reservations_member_id_fkey FOREIGN KEY (member_id) REFERENCES members(id),
ADD CONSTRAINT recurring_reservations_member_subscription_id_fkey FOREIGN KEY (member_subscription_id) REFERENCES member_subscriptions(id),
ADD CONSTRAINT recurring_reservations_member_package_id_fkey FOREIGN KEY (member_package_id) REFERENCES member_packages(id),
ADD CONSTRAINT unique_session_package_recurring UNIQUE (session_id, member_package_id),
ADD CONSTRAINT unique_session_subscription_recurring UNIQUE (session_id, member_subscription_id);


CREATE TABLE IF NOT EXISTS recurring_reservations_exceptions (
    recurring_reservation_id bigint NOT NULL,
    occurrence_date date NOT NULL,
    is_canceled boolean NOT NULL DEFAULT false,
    reservation_id bigint,
    CONSTRAINT recurring_reservations_exceptions_reservation_id_fkey FOREIGN KEY (reservation_id) REFERENCES reservations(id),
    CONSTRAINT recurring_reservations_exceptions_recurring_reservation_id_fkey FOREIGN KEY (recurring_reservation_id) REFERENCES recurring_reservations(id),
    CONSTRAINT unique_exception_recurring UNIQUE (recurring_reservation_id, occurrence_date)
);

ALTER TABLE check_ins
ADD COLUMN recurring_id bigint;

ALTER TABLE check_ins
ADD CONSTRAINT check_ins_recurring_id_fkey FOREIGN KEY (recurring_id) REFERENCES recurring_reservations(id);

ALTER TABLE check_ins
DROP CONSTRAINT IF EXISTS check_ins_reservation_id_foreign;

ALTER TABLE recurring_reservations_exceptions
DROP CONSTRAINT IF EXISTS recurring_reservations_exceptions_reservation_id_fkey;

ALTER TABLE recurring_reservations_exceptions
DROP COLUMN IF EXISTS reservation_id,
DROP COLUMN IF EXISTS is_canceled;

