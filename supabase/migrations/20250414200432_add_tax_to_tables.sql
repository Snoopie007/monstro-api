ALTER TABLE location_state ADD COLUMN tax_rate integer DEFAULT 0 NOT NULL;
ALTER TABLE transactions ADD COLUMN tax_amount integer DEFAULT 0 NOT NULL;
