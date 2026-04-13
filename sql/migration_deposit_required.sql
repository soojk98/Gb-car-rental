-- Adds a per-driver flag for whether a deposit is required.
-- Defaults to TRUE so existing drivers continue to need a deposit.

ALTER TABLE public.drivers
    ADD COLUMN IF NOT EXISTS deposit_required boolean NOT NULL DEFAULT true;
