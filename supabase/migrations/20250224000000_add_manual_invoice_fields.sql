-- Add manual invoicing support fields to member_invoices table
ALTER TABLE member_invoices
ADD COLUMN IF NOT EXISTS payment_type TEXT DEFAULT 'cash' NOT NULL,
ADD COLUMN IF NOT EXISTS invoice_type TEXT DEFAULT 'one-off' NOT NULL,
ADD COLUMN IF NOT EXISTS sent_at TIMESTAMP WITH TIME ZONE;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_invoices_payment_type
ON member_invoices(location_id, payment_type) 
WHERE payment_type != 'card';

CREATE INDEX IF NOT EXISTS idx_invoices_sent 
ON member_invoices(member_id, status) 
WHERE payment_type = 'cash';
