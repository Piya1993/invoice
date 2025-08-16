-- Add email column to companies table
ALTER TABLE public.companies
ADD COLUMN email text NULL;

-- Remove logo_url and default_currency from settings table
-- First, ensure there are no dependencies on these columns if they exist.
-- Then, drop the columns.
ALTER TABLE public.settings
DROP COLUMN IF EXISTS logo_url;

ALTER TABLE public.settings
DROP COLUMN IF EXISTS default_currency;