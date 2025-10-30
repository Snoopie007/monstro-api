-- Add manual invoicing support fields to member_invoices table
ALTER TABLE member_invoices
ADD COLUMN IF NOT EXISTS payment_method TEXT DEFAULT 'stripe' NOT NULL,
ADD COLUMN IF NOT EXISTS invoice_type TEXT DEFAULT 'one-off' NOT NULL,
ADD COLUMN IF NOT EXISTS sent_at TIMESTAMP WITH TIME ZONE;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_invoices_payment_method 
ON member_invoices(location_id, payment_method) 
WHERE payment_method != 'stripe';

CREATE INDEX IF NOT EXISTS idx_invoices_sent 
ON member_invoices(member_id, status) 
WHERE payment_method = 'manual';
