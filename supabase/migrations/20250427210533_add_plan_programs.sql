CREATE TABLE IF NOT EXISTS plan_programs (
    plan_id text REFERENCES member_plans (id) ON DELETE CASCADE NOT NULL,
    program_id text REFERENCES programs (id) ON DELETE CASCADE NOT NULL,
    PRIMARY KEY (plan_id, program_id)
);



CREATE INDEX idx_plan_programs_plan_id ON plan_programs (plan_id);
CREATE INDEX idx_plan_programs_program_id ON plan_programs (program_id);








