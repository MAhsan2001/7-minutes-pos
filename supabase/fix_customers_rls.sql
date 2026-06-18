-- ==============================================================================
-- FIX CUSTOMERS ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================
-- Run this script in your Supabase SQL Editor to fix the 
-- "new row violates row-level security policy for table 'customers'" error.
-- ==============================================================================

-- Make sure RLS is fully enabled
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_ledgers ENABLE ROW LEVEL SECURITY;

-- Drop any existing policies that might be conflicting
DO $$ BEGIN
  DROP POLICY IF EXISTS "Allow authenticated read customers" ON public.customers;
  DROP POLICY IF EXISTS "Allow authenticated insert customers" ON public.customers;
  DROP POLICY IF EXISTS "Allow authenticated update customers" ON public.customers;
  DROP POLICY IF EXISTS "Allow admin delete customers" ON public.customers;
EXCEPTION WHEN undefined_object THEN null; END $$;

-- Create correct policies for Customers
-- 1. Anyone logged in can read customers
CREATE POLICY "Allow authenticated read customers" 
ON public.customers FOR SELECT TO authenticated USING (true);

-- 2. Anyone logged in can create a new customer
CREATE POLICY "Allow authenticated insert customers" 
ON public.customers FOR INSERT TO authenticated WITH CHECK (true);

-- 3. Anyone logged in can update a customer
CREATE POLICY "Allow authenticated update customers" 
ON public.customers FOR UPDATE TO authenticated USING (true);

-- 4. Only Admins can permanently delete a customer
CREATE POLICY "Allow admin delete customers" 
ON public.customers FOR DELETE TO authenticated USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
);

-- Fix ledgers policies while we're at it
DO $$ BEGIN
  DROP POLICY IF EXISTS "Allow authenticated read ledgers" ON public.customer_ledgers;
  DROP POLICY IF EXISTS "Allow authenticated insert ledgers" ON public.customer_ledgers;
EXCEPTION WHEN undefined_object THEN null; END $$;

CREATE POLICY "Allow authenticated read ledgers" 
ON public.customer_ledgers FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow authenticated insert ledgers" 
ON public.customer_ledgers FOR INSERT TO authenticated WITH CHECK (true);
