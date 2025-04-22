ALTER TABLE programs 
  ADD COLUMN cancelation_threshold integer NOT NULL DEFAULT 24,
  ADD COLUMN allow_waitlist boolean NOT NULL DEFAULT false,
  ADD COLUMN waitlist_capacity integer NOT NULL DEFAULT 0,
  ADD COLUMN allow_make_up_class boolean NOT NULL DEFAULT false;


CREATE TABLE IF NOT EXISTS session_waitlist (
    session_id bigint NOT NULL,
    member_id bigint NOT NULL,
    CONSTRAINT session_waitlist_session_id_foreign FOREIGN KEY (session_id) REFERENCES program_sessions (id) ON DELETE CASCADE,
    CONSTRAINT session_waitlist_member_id_foreign FOREIGN KEY (member_id) REFERENCES members (id) ON DELETE CASCADE,
    CONSTRAINT session_waitlist_unique UNIQUE (session_id, member_id)
);

CREATE INDEX IF NOT EXISTS idx_session_waitlist_session_id ON session_waitlist (session_id);
CREATE INDEX IF NOT EXISTS idx_session_waitlist_member_id ON session_waitlist (member_id);
