CREATE TYPE role_color AS ENUM('red', 'green', 'blue', 'pink', 'cyan', 'lime', 'orange', 'fuchsia', 'sky', 'lemon', 'purple', 'yellow');


CREATE TABLE IF NOT EXISTS roles (
  id text PRIMARY KEY NOT NULL DEFAULT uuid_base62(),
  name text NOT NULL,
  guard_name text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone,
  location_id text REFERENCES locations (id) ON DELETE CASCADE,
  color role_color,
  CONSTRAINT roles_name_guard_name_unique UNIQUE (name, guard_name)
);


CREATE TABLE IF NOT EXISTS permissions (
  id text PRIMARY KEY NOT NULL DEFAULT uuid_base62(),
  name text NOT NULL,
  guard_name text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone,
  description text,
  CONSTRAINT permissions_name_guard_name_unique UNIQUE (name, guard_name)
);

-- Tables with dependencies on roles
CREATE TABLE IF NOT EXISTS role_has_permissions (
  permission_id text REFERENCES permissions (id) ON DELETE CASCADE NOT NULL,
  role_id text REFERENCES roles (id) ON DELETE CASCADE NOT NULL,
  CONSTRAINT role_has_permissions_pkey PRIMARY KEY (permission_id, role_id)
);

CREATE TABLE IF NOT EXISTS user_roles (
  user_id text REFERENCES users (id) ON DELETE CASCADE NOT NULL,
  role_id text REFERENCES roles (id) ON DELETE CASCADE NOT NULL,
  CONSTRAINT user_roles_pkey PRIMARY KEY (user_id, role_id)
);

CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON user_roles (user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role_id ON user_roles (role_id);

CREATE TABLE IF NOT EXISTS staff_location_roles (
  staff_location_id text REFERENCES staff_locations (id) ON DELETE CASCADE NOT NULL,
  role_id text REFERENCES roles (id) ON DELETE CASCADE NOT NULL,
  CONSTRAINT staff_location_roles_pkey PRIMARY KEY (staff_location_id, role_id)
);

CREATE INDEX IF NOT EXISTS idx_staff_location_roles_staff_location_id ON staff_location_roles (staff_location_id);
CREATE INDEX IF NOT EXISTS idx_staff_location_roles_role_id ON staff_location_roles (role_id);
