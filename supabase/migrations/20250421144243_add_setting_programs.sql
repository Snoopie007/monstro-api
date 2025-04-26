ALTER TABLE programs 
  ADD COLUMN cancelation_threshold integer NOT NULL DEFAULT 24,
  ADD COLUMN allow_waitlist boolean NOT NULL DEFAULT false,
  ADD COLUMN waitlist_capacity integer NOT NULL DEFAULT 0,
  ADD COLUMN allow_make_up_class boolean NOT NULL DEFAULT false;


CREATE TABLE IF NOT EXISTS session_waitlist (
    session_id bigint NOT NULL,
    member_id bigint NOT NULL,
    session_date date NOT NULL,
    CONSTRAINT session_waitlist_session_id_foreign FOREIGN KEY (session_id) REFERENCES program_sessions (id) ON DELETE CASCADE,
    CONSTRAINT session_waitlist_member_id_foreign FOREIGN KEY (member_id) REFERENCES members (id) ON DELETE CASCADE,
    CONSTRAINT session_waitlist_unique UNIQUE (session_id, member_id)
);

CREATE INDEX IF NOT EXISTS idx_session_waitlist_session_id ON session_waitlist (session_id);
CREATE INDEX IF NOT EXISTS idx_session_waitlist_member_id ON session_waitlist (member_id);


ALTER TABLE wallet  
  RENAME TO wallets;

ALTER TABLE wallets
  RENAME COLUMN credit TO credits;

ALTER TABLE wallets
  DROP COLUMN deleted_at;

ALTER TABLE wallets
  ALTER COLUMN recharge_amount SET DEFAULT 2500,
  ALTER COLUMN recharge_threshold SET DEFAULT 1000;


ALTER TABLE wallet_usage
  RENAME TO wallet_usages;

ALTER TABLE wallet_usages
  ADD COLUMN is_credit boolean NOT NULL DEFAULT false;

ALTER TABLE wallet_usages
  DROP COLUMN category,
  DROP COLUMN event_id,
  DROP COLUMN activity_date,
  DROP COLUMN recharge_threshold,
  DROP COLUMN updated_at,
  DROP COLUMN deleted_at;

ALTER TABLE wallet_usages
  ADD COLUMN activity_date timestamp with time zone;


