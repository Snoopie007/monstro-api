ALTER TABLE member_contracts
DROP COLUMN IF EXISTS member_plan_id;

ALTER TABLE member_contracts
DROP CONSTRAINT IF EXISTS member_contracts_member_plan_id_fkey;
