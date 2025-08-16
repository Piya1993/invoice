-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create companies table
CREATE TABLE public.companies (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    name text NOT NULL,
    logo_url text,
    address text,
    phone text,
    tax_id text,
    currency text DEFAULT 'PKR' NOT NULL,
    created_by uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Create clients table
CREATE TABLE public.clients (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    company_id uuid REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL,
    name text NOT NULL,
    email text,
    phone text,
    address text,
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Create products table
CREATE TABLE public.products (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    company_id uuid REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL,
    name text NOT NULL,
    description text,
    unit text,
    default_price bigint NOT NULL, -- Stored in smallest unit (e.g., paisas)
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Create invoices table
CREATE TYPE invoice_status AS ENUM ('draft', 'sent', 'paid', 'overdue', 'void');
CREATE TABLE public.invoices (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    company_id uuid REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL,
    client_id uuid REFERENCES public.clients(id) ON DELETE CASCADE NOT NULL,
    number text, -- Will be generated later
    issue_date date NOT NULL,
    due_date date NOT NULL,
    status invoice_status DEFAULT 'draft' NOT NULL,
    currency text NOT NULL,
    notes text,
    terms text,
    subtotal bigint NOT NULL, -- Stored in smallest unit
    tax_total bigint NOT NULL, -- Stored in smallest unit
    discount_total bigint NOT NULL, -- Stored in smallest unit
    total bigint NOT NULL, -- Stored in smallest unit
    amount_paid bigint DEFAULT 0 NOT NULL, -- Stored in smallest unit
    amount_due bigint NOT NULL, -- Stored in smallest unit
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Create invoice_items table
CREATE TABLE public.invoice_items (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    invoice_id uuid REFERENCES public.invoices(id) ON DELETE CASCADE NOT NULL,
    product_id uuid REFERENCES public.products(id) ON DELETE SET NULL, -- Optional link to product
    title text NOT NULL,
    qty numeric(10, 2) NOT NULL,
    unit_price bigint NOT NULL, -- Stored in smallest unit
    tax_rate numeric(5, 2) DEFAULT 0 NOT NULL, -- Percentage, e.g., 0.05 for 5%
    discount bigint DEFAULT 0 NOT NULL, -- Stored in smallest unit
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Create payments table
CREATE TABLE public.payments (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    invoice_id uuid REFERENCES public.invoices(id) ON DELETE CASCADE NOT NULL,
    date date NOT NULL,
    method text NOT NULL,
    amount bigint NOT NULL, -- Stored in smallest unit
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Create settings table
CREATE TABLE public.settings (
    company_id uuid REFERENCES public.companies(id) ON DELETE CASCADE PRIMARY KEY,
    logo_url text,
    default_tax_rate numeric(5, 2) DEFAULT 0 NOT NULL,
    default_currency text DEFAULT 'PKR' NOT NULL,
    numbering_prefix text DEFAULT 'INV' NOT NULL,
    next_number integer DEFAULT 1 NOT NULL,
    locale text DEFAULT 'en-PK' NOT NULL,
    timezone text DEFAULT 'Asia/Karachi' NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Set up Row Level Security (RLS)
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;

-- Policies for companies table
CREATE POLICY "Users can create companies." ON public.companies FOR INSERT WITH CHECK (auth.uid() = created_by);
CREATE POLICY "Users can view their own companies." ON public.companies FOR SELECT USING (auth.uid() = created_by);
CREATE POLICY "Users can update their own companies." ON public.companies FOR UPDATE USING (auth.uid() = created_by);
CREATE POLICY "Users can delete their own companies." ON public.companies FOR DELETE USING (auth.uid() = created_by);

-- Helper function to get the company_id for the current user (owner)
CREATE OR REPLACE FUNCTION get_user_company_id()
RETURNS uuid AS $$
  SELECT id FROM public.companies WHERE created_by = auth.uid() LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER;

-- Policies for clients
CREATE POLICY "Users can create clients for their company." ON public.clients FOR INSERT WITH CHECK (company_id = get_user_company_id());
CREATE POLICY "Users can view clients for their company." ON public.clients FOR SELECT USING (company_id = get_user_company_id());
CREATE POLICY "Users can update clients for their company." ON public.clients FOR UPDATE USING (company_id = get_user_company_id());
CREATE POLICY "Users can delete clients for their company." ON public.clients FOR DELETE USING (company_id = get_user_company_id());

-- Policies for products
CREATE POLICY "Users can create products for their company." ON public.products FOR INSERT WITH CHECK (company_id = get_user_company_id());
CREATE POLICY "Users can view products for their company." ON public.products FOR SELECT USING (company_id = get_user_company_id());
CREATE POLICY "Users can update products for their company." ON public.products FOR UPDATE USING (company_id = get_user_company_id());
CREATE POLICY "Users can delete products for their company." ON public.products FOR DELETE USING (company_id = get_user_company_id());

-- Policies for invoices
CREATE POLICY "Users can create invoices for their company." ON public.invoices FOR INSERT WITH CHECK (company_id = get_user_company_id());
CREATE POLICY "Users can view invoices for their company." ON public.invoices FOR SELECT USING (company_id = get_user_company_id());
CREATE POLICY "Users can update invoices for their company." ON public.invoices FOR UPDATE USING (company_id = get_user_company_id());
CREATE POLICY "Users can delete invoices for their company." ON public.invoices FOR DELETE USING (company_id = get_user_company_id());

-- Policies for invoice_items
CREATE POLICY "Users can create invoice items for their company's invoices." ON public.invoice_items FOR INSERT WITH CHECK ((SELECT company_id FROM public.invoices WHERE id = invoice_id) = get_user_company_id());
CREATE POLICY "Users can view invoice items for their company's invoices." ON public.invoice_items FOR SELECT USING ((SELECT company_id FROM public.invoices WHERE id = invoice_id) = get_user_company_id());
CREATE POLICY "Users can update invoice items for their company's invoices." ON public.invoice_items FOR UPDATE USING ((SELECT company_id FROM public.invoices WHERE id = invoice_id) = get_user_company_id());
CREATE POLICY "Users can delete invoice items for their company's invoices." ON public.invoice_items FOR DELETE USING ((SELECT company_id FROM public.invoices WHERE id = invoice_id) = get_user_company_id());

-- Policies for payments
CREATE POLICY "Users can create payments for their company's invoices." ON public.payments FOR INSERT WITH CHECK ((SELECT company_id FROM public.invoices WHERE id = invoice_id) = get_user_company_id());
CREATE POLICY "Users can view payments for their company's invoices." ON public.payments FOR SELECT USING ((SELECT company_id FROM public.invoices WHERE id = invoice_id) = get_user_company_id());
CREATE POLICY "Users can update payments for their company's invoices." ON public.payments FOR UPDATE USING ((SELECT company_id FROM public.invoices WHERE id = invoice_id) = get_user_company_id());
CREATE POLICY "Users can delete payments for their company's invoices." ON public.payments FOR DELETE USING ((SELECT company_id FROM public.invoices WHERE id = invoice_id) = get_user_company_id());

-- Policies for settings
CREATE POLICY "Users can create settings for their company." ON public.settings FOR INSERT WITH CHECK (company_id = get_user_company_id());
CREATE POLICY "Users can view settings for their company." ON public.settings FOR SELECT USING (company_id = get_user_company_id());
CREATE POLICY "Users can update settings for their company." ON public.settings FOR UPDATE USING (company_id = get_user_company_id());
CREATE POLICY "Users can delete settings for their company." ON public.settings FOR DELETE USING (company_id = get_user_company_id());