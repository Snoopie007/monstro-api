CREATE TYPE relationship AS ENUM('parent', 'spouse', 'child', 'sibling', 'other');
CREATE TABLE IF NOT EXISTS family_members (
  id text PRIMARY KEY NOT NULL DEFAULT uuid_base62(),
  member_id text REFERENCES members (id) ON DELETE CASCADE NOT NULL,
  related_member_id text REFERENCES members (id) ON DELETE CASCADE NOT NULL,
  relationship relationship NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone
);

ALTER TABLE family_members ADD CONSTRAINT family_members_parent_unique UNIQUE (member_id, related_member_id);

CREATE INDEX IF NOT EXISTS idx_family_members_member_id ON family_members (member_id);
CREATE INDEX IF NOT EXISTS idx_family_members_related_member_id ON family_members (related_member_id);