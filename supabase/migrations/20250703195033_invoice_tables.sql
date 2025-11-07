

CREATE TYPE transaction_type AS ENUM('inbound', 'outbound');
CREATE TYPE invoice_status AS ENUM('draft', 'paid', 'unpaid', 'uncollectible', 'void');
CREATE TYPE transaction_status AS ENUM('paid', 'failed', 'incomplete');
-- Tables with dependencies on members, locations, and member_subscriptions/packages
CREATE TABLE IF NOT EXISTS member_invoices (
  id text PRIMARY KEY NOT NULL DEFAULT uuid_base62('inv_'),
  currency text,
  member_id text REFERENCES members (id) ON DELETE CASCADE NOT NULL,
  location_id text REFERENCES locations (id) ON DELETE CASCADE NOT NULL,
  description text,
  items jsonb[] DEFAULT '{}'::jsonb[],
  paid boolean NOT NULL DEFAULT false,
  tax integer NOT NULL CHECK (tax >= 0),
  total bigint NOT NULL CHECK (total >= 0),
  discount bigint NOT NULL CHECK (discount >= 0),
  subtotal bigint NOT NULL CHECK (subtotal >= 0),
  due_date timestamp with time zone NOT NULL DEFAULT now(),
  attempt_count integer NOT NULL DEFAULT 0,
  invoice_pdf text,
  status invoice_status NOT NULL DEFAULT 'draft',
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  member_subscription_id text REFERENCES member_subscriptions (id) ON DELETE CASCADE,
  for_period_start timestamp with time zone,
  for_period_end timestamp with time zone
);

CREATE INDEX IF NOT EXISTS idx_member_invoices_member_id ON member_invoices (member_id);
CREATE INDEX IF NOT EXISTS idx_member_invoices_location_id ON member_invoices (location_id);
CREATE INDEX IF NOT EXISTS idx_member_invoices_status ON member_invoices (status);


CREATE TABLE IF NOT EXISTS transactions (
  id text PRIMARY KEY NOT NULL DEFAULT uuid_base62('txn_'),
  description text,
  type transaction_type NOT NULL,
  total integer NOT NULL,
  sub_total integer NOT NULL,
  total_tax integer NOT NULL DEFAULT 0,
  status transaction_status NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone,
  location_id text REFERENCES locations (id) ON DELETE CASCADE NOT NULL,
  member_id text REFERENCES members (id) ON DELETE CASCADE,
  payment_type text NOT NULL,
  items jsonb[] DEFAULT '{}'::jsonb[],
  charge_date timestamp with time zone DEFAULT now(),
  currency text NOT NULL DEFAULT 'USD',
  metadata jsonb NOT NULL DEFAULT '{}',
  refunded boolean NOT NULL DEFAULT false,
  refunded_amount integer NOT NULL DEFAULT 0,
  invoice_id text REFERENCES member_invoices (id) ON DELETE CASCADE,
);
