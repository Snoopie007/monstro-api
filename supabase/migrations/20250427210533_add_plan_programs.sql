CREATE TABLE IF NOT EXISTS plan_programs (
    plan_id INT NOT NULL,
    program_id INT NOT NULL
);

ALTER TABLE plan_programs
ADD CONSTRAINT fk_member_plans_plan_id FOREIGN KEY (plan_id) REFERENCES member_plans(id),
ADD CONSTRAINT fk_member_plans_program_id FOREIGN KEY (program_id) REFERENCES programs(id),
ADD UNIQUE (plan_id, program_id);

CREATE INDEX idx_plan_programs_plan_id ON plan_programs (plan_id);
CREATE INDEX idx_plan_programs_program_id ON plan_programs (program_id);


ALTER TABLE programs
DROP COLUMN benefits;

ALTER TABLE member_plans
DROP CONSTRAINT member_plans_program_id_foreign;


ALTER TABLE member_plans
ADD COLUMN location_id INT NOT NULL;

ALTER TABLE member_plans
DROP COLUMN program_id;

ALTER TABLE member_plans
ADD CONSTRAINT fk_member_plans_location_id FOREIGN KEY (location_id) REFERENCES locations(id);

ALTER TABLE member_plans
ADD COLUMN marketing_details JSONB NOT NULL DEFAULT '{}';


