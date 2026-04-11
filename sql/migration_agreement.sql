-- =====================================================================
-- GB Car Rental — driver rental agreement migration
-- =====================================================================
-- Adds three columns on drivers to track the rental agreement that
-- admin uploads and the driver acknowledges.
--
-- Apply in the Supabase SQL Editor (idempotent — safe to re-run).
-- =====================================================================

ALTER TABLE public.drivers
    ADD COLUMN IF NOT EXISTS agreement_file_path       text,
    ADD COLUMN IF NOT EXISTS agreement_uploaded_at     timestamptz,
    ADD COLUMN IF NOT EXISTS agreement_acknowledged_at timestamptz;
