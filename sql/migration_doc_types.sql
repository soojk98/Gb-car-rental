-- =====================================================================
-- GB Car Rental — document types migration
-- =====================================================================
-- Replace the 'other' document type with 'electric_bill' and 'water_bill'.
--
-- Apply in the Supabase SQL Editor (idempotent — safe to re-run).
-- =====================================================================

-- 1. Remove any existing rows of the old 'other' type so the new
--    constraint can be applied. If you want to keep them, change the
--    DELETE to an UPDATE that maps them to one of the new types.
DELETE FROM public.documents WHERE type = 'other';

-- 2. Drop the old check constraint and add the new one
ALTER TABLE public.documents
    DROP CONSTRAINT IF EXISTS documents_type_check;

ALTER TABLE public.documents
    ADD CONSTRAINT documents_type_check
    CHECK (type IN ('nric', 'license', 'psv', 'electric_bill', 'water_bill'));
