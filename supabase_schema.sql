-- This is your Supabase schema.
-- It is used to define your database tables, functions, and enums.
-- You can generate this file using `supabase gen types typescript --project-id <YOUR_PROJECT_ID> --schema public > src/types/supabase.ts`

-- Enums
CREATE TYPE invoice_status AS ENUM ('draft', 'sent', 'paid', 'overdue', 'void');

-- Tables
CREATE TABLE companies (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    name text NOT NULL,
    logo_url text,
    address text,
    phone text,
    email text, -- New email column
    tax_id text,
    currency text NOT NULL DEFAULT 'PKR',
    created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE settings (
    company_id uuid PRIMARY KEY REFERENCES companies(id) ON DELETE CASCADE,
    logo_url text, -- Redundant, will be removed from here later
    default_tax_rate numeric NOT NULL DEFAULT 0,
    default_currency text NOT NULL DEFAULT 'PKR', -- Redundant, will be removed from here later
    numbering_prefix text NOT NULL DEFAULT 'INV-',
    next_number integer NOT NULL DEFAULT 1,
    locale text NOT NULL DEFAULT 'en-PK',
    timezone text NOT NULL DEFAULT 'Asia/Karachi',
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE clients (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    name text NOT NULL,
    email text,
    phone text,
    address text,
    notes text,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE products (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    name text NOT NULL,
    description text,
    unit text,
    default_price numeric NOT NULL, -- Stored in smallest unit (e.g., paisas)
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE invoices (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    client_id uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    number text,
    issue_date date NOT NULL,
    due_date date NOT NULL,
    status invoice_status NOT NULL DEFAULT 'draft',
    currency text NOT NULL,
    notes text,
    terms text,
    subtotal numeric NOT NULL, -- Stored in smallest unit
    tax_total numeric NOT NULL, -- Stored in smallest unit
    discount_total numeric NOT NULL, -- Stored in smallest unit
    total numeric NOT NULL, -- Stored in smallest unit
    amount_paid numeric NOT NULL DEFAULT 0, -- Stored in smallest unit
    amount_due numeric NOT NULL, -- Stored in smallest unit
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE invoice_items (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    invoice_id uuid NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
    product_id uuid REFERENCES products(id) ON DELETE SET NULL,
    title text NOT NULL,
    qty numeric NOT NULL,
    unit_price numeric NOT NULL, -- Stored in smallest unit
    tax_rate numeric NOT NULL DEFAULT 0, -- Percentage
    discount numeric NOT NULL DEFAULT 0, -- Stored in smallest unit
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE payments (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    invoice_id uuid NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
    date date NOT NULL,
    method text NOT NULL,
    amount numeric NOT NULL, -- Stored in smallest unit
    notes text,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Row Level Security (RLS)
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

-- Policies for companies table
CREATE POLICY "Enable read access for authenticated users" ON companies FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Enable insert for authenticated users" ON companies FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Enable update for users who created the company" ON companies FOR UPDATE USING (auth.uid() = created_by);
CREATE POLICY "Enable delete for users who created the company" ON companies FOR DELETE USING (auth.uid() = created_by);

-- Policies for settings table
CREATE POLICY "Enable read access for authenticated users based on company_id" ON settings FOR SELECT USING (EXISTS (SELECT 1 FROM companies WHERE companies.id = settings.company_id AND companies.created_by = auth.uid()));
CREATE POLICY "Enable insert for authenticated users based on company_id" ON settings FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM companies WHERE companies.id = settings.company_id AND companies.created_by = auth.uid()));
CREATE POLICY "Enable update for users who own the company" ON settings FOR UPDATE USING (EXISTS (SELECT 1 FROM companies WHERE companies.id = settings.company_id AND companies.created_by = auth.uid()));

-- Policies for clients table
CREATE POLICY "Enable read access for authenticated users based on company_id" ON clients FOR SELECT USING (EXISTS (SELECT 1 FROM companies WHERE companies.id = clients.company_id AND companies.created_by = auth.uid()));
CREATE POLICY "Enable insert for authenticated users based on company_id" ON clients FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM companies WHERE companies.id = clients.company_id AND companies.created_by = auth.uid()));
CREATE POLICY "Enable update for users who own the company" ON clients FOR UPDATE USING (EXISTS (SELECT 1 FROM companies WHERE companies.id = clients.company_id AND companies.created_by = auth.uid()));
CREATE POLICY "Enable delete for users who own the company" ON clients FOR DELETE USING (EXISTS (SELECT 1 FROM companies WHERE companies.id = clients.company_id AND companies.created_by = auth.uid()));

-- Policies for products table
CREATE POLICY "Enable read access for authenticated users based on company_id" ON products FOR SELECT USING (EXISTS (SELECT 1 FROM companies WHERE companies.id = products.company_id AND companies.created_by = auth.uid()));
CREATE POLICY "Enable insert for authenticated users based on company_id" ON products FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM companies WHERE companies.id = products.company_id AND companies.created_by = auth.uid()));
CREATE POLICY "Enable update for users who own the company" ON products FOR UPDATE USING (EXISTS (SELECT 1 FROM companies WHERE companies.id = products.company_id AND companies.created_by = auth.uid()));
CREATE POLICY "Enable delete for users who own the company" ON products FOR DELETE USING (EXISTS (SELECT 1 FROM companies WHERE companies.id = products.company_id AND companies.created_by = auth.uid()));

-- Policies for invoices table
CREATE POLICY "Enable read access for authenticated users based on company_id" ON invoices FOR SELECT USING (EXISTS (SELECT 1 FROM companies WHERE companies.id = invoices.company_id AND companies.created_by = auth.uid()));
CREATE POLICY "Enable insert for authenticated users based on company_id" ON invoices FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM companies WHERE companies.id = invoices.company_id AND companies.created_by = auth.uid()));
CREATE POLICY "Enable update for users who own the company" ON invoices FOR UPDATE USING (EXISTS (SELECT 1 FROM companies WHERE companies.id = invoices.company_id AND companies.created_by = auth.uid()));
CREATE POLICY "Enable delete for users who own the company" ON invoices FOR DELETE USING (EXISTS (SELECT 1 FROM companies WHERE companies.id = invoices.company_id AND companies.created_by = auth.uid()));

-- Policies for invoice_items table
CREATE POLICY "Enable read access for authenticated users based on invoice_id" ON invoice_items FOR SELECT USING (EXISTS (SELECT 1 FROM invoices WHERE invoices.id = invoice_items.invoice_id AND invoices.company_id IN (SELECT id FROM companies WHERE created_by = auth.uid())));
CREATE POLICY "Enable insert for authenticated users based on invoice_id" ON invoice_items FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM invoices WHERE invoices.id = invoice_items.invoice_id AND invoices.company_id IN (SELECT id FROM companies WHERE created_by = auth.uid())));
CREATE POLICY "Enable update for users who own the invoice" ON invoice_items FOR UPDATE USING (EXISTS (SELECT 1 FROM invoices WHERE invoices.id = invoice_items.invoice_id AND invoices.company_id IN (SELECT id FROM companies WHERE created_by = auth.uid())));
CREATE POLICY "Enable delete for users who own the invoice" ON invoice_items FOR DELETE USING (EXISTS (SELECT 1 FROM invoices WHERE invoices.id = invoice_items.invoice_id AND invoices.company_id IN (SELECT id FROM companies WHERE created_by = auth.uid())));

-- Policies for payments table
CREATE POLICY "Enable read access for authenticated users based on invoice_id" ON payments FOR SELECT USING (EXISTS (SELECT 1 FROM invoices WHERE invoices.id = payments.invoice_id AND invoices.company_id IN (SELECT id FROM companies WHERE created_by = auth.uid())));
CREATE POLICY "Enable insert for authenticated users based on invoice_id" ON payments FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM invoices WHERE invoices.id = payments.invoice_id AND invoices.company_id IN (SELECT id FROM companies WHERE created_by = auth.uid())));
CREATE POLICY "Enable update for users who own the invoice" ON payments FOR UPDATE USING (EXISTS (SELECT 1 FROM invoices WHERE invoices.id = payments.invoice_id AND invoices.company_id IN (SELECT id FROM companies WHERE created_by = auth.uid())));
CREATE POLICY "Enable delete for users who own the invoice" ON payments FOR DELETE USING (EXISTS (SELECT 1 FROM invoices WHERE invoices.id = payments.invoice_id AND invoices.company_id IN (SELECT id FROM companies WHERE created_by = auth.uid())));

-- Functions
CREATE OR REPLACE FUNCTION get_user_company_id()
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    user_company_id uuid;
BEGIN
    SELECT id INTO user_company_id FROM public.companies WHERE created_by = auth.uid();
    RETURN user_company_id;
END;
$$;

-- Set up Realtime
BEGIN;
  -- Remove the realtime publication for all tables
  DROP PUBLICATION IF EXISTS supabase_realtime;

  -- Create a new publication for all tables in the public schema
  CREATE PUBLICATION supabase_realtime FOR TABLE public.companies, public.settings, public.clients, public.products, public.invoices, public.invoice_items, public.payments;
COMMIT;