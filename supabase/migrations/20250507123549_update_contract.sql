ALTER TABLE member_contracts
DROP COLUMN IF EXISTS member_plan_id;

ALTER TABLE member_contracts
DROP CONSTRAINT IF EXISTS member_contracts_member_plan_id_fkey;


ALTER TABLE member_locations
DROP CONSTRAINT member_locations_waiver_id_fkey;

ALTER TABLE member_locations
ADD CONSTRAINT member_locations_waiver_id_fkey FOREIGN KEY (waiver_id) REFERENCES member_contracts (id) ON DELETE SET NULL;