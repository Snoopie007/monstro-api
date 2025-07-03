
CREATE TYPE program_status AS ENUM('active', 'inactive');

CREATE TABLE IF NOT EXISTS programs (
  id text PRIMARY KEY NOT NULL DEFAULT uuid_base62(),
  location_id text REFERENCES locations (id) ON DELETE CASCADE NOT NULL,
  instructor_id text REFERENCES staffs (id) ON DELETE SET NULL,
  name text NOT NULL,
  description text NOT NULL,
  icon text,
  capacity integer NOT NULL,
  min_age integer NOT NULL,
  max_age integer NOT NULL,
  status program_status NOT NULL DEFAULT 'active',
  interval plan_interval NOT NULL DEFAULT 'week',
  interval_threshold smallint NOT NULL DEFAULT 1,
  cancelation_threshold integer NOT NULL DEFAULT 24,
  allow_waitlist boolean NOT NULL DEFAULT false,
  waitlist_capacity integer NOT NULL DEFAULT 0,
  allow_make_up_class boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone
);

CREATE INDEX IF NOT EXISTS idx_programs_location_id ON programs (location_id);

CREATE TABLE IF NOT EXISTS program_tags (
  id text PRIMARY KEY NOT NULL DEFAULT uuid_base62(),
  name text NOT NULL,
  CONSTRAINT program_tags_name_unique UNIQUE (name)
);

CREATE TABLE IF NOT EXISTS program_has_tags (
  program_id text REFERENCES programs (id) ON DELETE CASCADE NOT NULL,
  tag_id text REFERENCES program_tags (id) ON DELETE CASCADE NOT NULL,
  CONSTRAINT program_has_tags_pkey PRIMARY KEY (program_id, tag_id)
);

CREATE TABLE IF NOT EXISTS program_sessions (
  id text PRIMARY KEY NOT NULL DEFAULT uuid_base62('pss_'),
  program_id text REFERENCES programs (id) ON DELETE CASCADE NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone,
  time time NOT NULL,
  duration smallint NOT NULL DEFAULT 0,
  day smallint NOT NULL DEFAULT 1 CHECK (day BETWEEN 1 AND 7),
  CONSTRAINT unique_program_session UNIQUE (program_id, day, time, duration)
);

CREATE INDEX IF NOT EXISTS idx_program_sessions_program_id ON program_sessions (program_id);


CREATE TABLE IF NOT EXISTS session_waitlist (
    session_id text REFERENCES program_sessions (id) ON DELETE CASCADE NOT NULL,
    member_id text REFERENCES members (id) ON DELETE CASCADE NOT NULL,
    session_date timestamp with time zone NOT NULL,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone,
    CONSTRAINT session_waitlist_unique UNIQUE (session_id, member_id)
);

CREATE INDEX IF NOT EXISTS idx_session_waitlist_session_id ON session_waitlist (session_id);
CREATE INDEX IF NOT EXISTS idx_session_waitlist_member_id ON session_waitlist (member_id);
