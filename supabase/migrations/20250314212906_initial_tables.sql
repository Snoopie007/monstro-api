CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE SCHEMA IF NOT EXISTS private;

-- UUID to Base62 conversion function
CREATE OR REPLACE FUNCTION uuid_base62(prefix text DEFAULT '') RETURNS text AS $$
DECLARE
    raw UUID := uuid_generate_v4();
    b64 text;
BEGIN
    b64 := encode(uuid_send(raw), 'base64');
    b64 := regexp_replace(b64, '[^a-zA-Z0-9]', '', 'g');
    RETURN prefix || b64;
END;
$$ LANGUAGE plpgsql;


-- Create ENUM types
CREATE TYPE payment_method AS ENUM('card', 'cash', 'check', 'zelle', 'venmo', 'paypal', 'apple', 'google');
CREATE TYPE interval_type AS ENUM('day', 'week', 'month', 'year');





