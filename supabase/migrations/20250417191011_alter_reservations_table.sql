ALTER TABLE reservations 
  ADD COLUMN auto boolean NOT NULL DEFAULT false,
  ADD COLUMN start_date timestamp with time zone NOT NULL DEFAULT now(),
  DROP CONSTRAINT IF EXISTS reservations_session_subscription_unique,
  DROP CONSTRAINT IF EXISTS reservations_session_package_unique;

ALTER TABLE locations
  ADD COLUMN about text;