CREATE TYPE import_status AS ENUM('pending', 'processing', 'completed', 'failed');

ALTER TABLE import_members 
    ALTER COLUMN status SET DEFAULT 'pending',
    ADD COLUMN member_id bigint,
    ADD COLUMN is_family_plan boolean NOT NULL DEFAULT false,
    ADD COLUMN is_primary_member boolean NOT NULL DEFAULT false,
    ALTER COLUMN last_renewal_day TYPE timestamp with time zone,
    ADD CONSTRAINT import_members_member_id_fkey FOREIGN KEY (member_id) REFERENCES members (id) ON DELETE SET NULL,
    ADD CONSTRAINT import_members_program_id_fkey FOREIGN KEY (program_id) REFERENCES programs (id) ON DELETE SET NULL,
    ADD CONSTRAINT import_members_plan_id_fkey FOREIGN KEY (plan_id) REFERENCES member_plans (id) ON DELETE SET NULL;

