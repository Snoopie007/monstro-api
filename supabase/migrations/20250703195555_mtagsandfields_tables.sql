CREATE TYPE custom_field_type AS ENUM ('text', 'number', 'date', 'boolean', 'select', 'multi-select');


CREATE TABLE IF NOT EXISTS member_tags (
    id text PRIMARY KEY NOT NULL DEFAULT uuid_base62('tag_'),
    name text NOT NULL,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS member_has_tags (
    member_id text REFERENCES members (id) ON DELETE CASCADE NOT NULL,
    tag_id text REFERENCES member_tags (id) ON DELETE CASCADE NOT NULL,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    PRIMARY KEY (member_id, tag_id)
);

CREATE TABLE IF NOT EXISTS member_fields (
    id text PRIMARY KEY NOT NULL DEFAULT uuid_base62(),
    name text NOT NULL,
    type custom_field_type NOT NULL,
    location_id text NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS member_custom_fields (
    member_id text NOT NULL REFERENCES members(id) ON DELETE CASCADE,
    custom_field_id text NOT NULL REFERENCES member_fields(id) ON DELETE CASCADE,
    value text NOT NULL,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone,
    CONSTRAINT mcf_member_field_unique UNIQUE (member_id, custom_field_id),
    PRIMARY KEY (member_id, custom_field_id)
);

