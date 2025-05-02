ALTER TABLE reservations 
  ADD COLUMN auto boolean NOT NULL DEFAULT false,
  ADD COLUMN start_date timestamp with time zone NOT NULL DEFAULT now(),
  
ALTER TABLE locations
  ADD COLUMN about text;