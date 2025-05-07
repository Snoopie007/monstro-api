ALTER TABLE reservation
DROP COLUMN status,
DROP COLUMN auto,
DROP COLUMN expired_on,
DROP TYPE reservation_status;

ALTER TABLE reservations
DROP CONSTRAINT unique_session_package_multi_session,
DROP CONSTRAINT unique_session_subscription_multi_session;



CREATE TABLE IF NOT EXISTS recurring_reservations (
    id bigserial PRIMARY KEY NOT NULL,
    session_id bigint NOT NULL,
    member_id bigint NOT NULL,
    start_date date NOT NULL,
    member_subscription_id bigint,
    member_package_id bigint,
    interval plan_interval NOT NULL DEFAULT 'week',
    interval_threshold smallint NOT NULL DEFAULT 1,
    end_date date NOT NULL,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone 
);

ALTER TABLE recurring_reservations
ADD CONSTRAINT recurring_reservations_session_id_fkey FOREIGN KEY (session_id) REFERENCES program_sessions(id);
ADD CONSTRAINT recurring_reservations_member_id_fkey FOREIGN KEY (member_id) REFERENCES members(id);
ADD CONSTRAINT recurring_reservations_member_subscription_id_fkey FOREIGN KEY (member_subscription_id) REFERENCES member_subscriptions(id);
ADD CONSTRAINT recurring_reservations_member_package_id_fkey FOREIGN KEY (member_package_id) REFERENCES member_packages(id);
ADD CONSTRAINT unique_session_package_recurring UNIQUE (session_id, member_package_id),
ADD CONSTRAINT unique_session_subscription_recurring UNIQUE (session_id, member_subscription_id);

