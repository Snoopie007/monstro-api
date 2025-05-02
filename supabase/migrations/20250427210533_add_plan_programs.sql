CREATE TABLE IF NOT EXISTS plan_programs (
    plan_id INT NOT NULL,
    program_id INT NOT NULL,
    PRIMARY KEY (plan_id, program_id)
);

ALTER TABLE plan_programs
ADD CONSTRAINT fk_member_plans_plan_id FOREIGN KEY (plan_id) REFERENCES member_plans(id),
ADD CONSTRAINT fk_member_plans_program_id FOREIGN KEY (program_id) REFERENCES programs(id);


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


ALTER TABLE member_subscriptions
DROP CONSTRAINT fk_member_subscriptions_program_id;

ALTER TABLE member_subscriptions
DROP COLUMN program_id,


ALTER TABLE reservations
DROP CONSTRAINT IF EXISTS unique_session_package,
DROP CONSTRAINT IF EXISTS unique_session_subscription;


ALTER TABLE reservations
ADD CONSTRAINT unique_session_package_single_session UNIQUE (session_id, member_package_id, start_date);
ADD CONSTRAINT unique_session_subscription_single_session UNIQUE (session_id, member_subscription_id, start_date);
