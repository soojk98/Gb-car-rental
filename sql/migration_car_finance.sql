-- =====================================================================
-- Car finance fields: purchase price + dates for P&L tracking
-- =====================================================================

ALTER TABLE public.cars
    ADD COLUMN IF NOT EXISTS purchase_price    numeric(12, 2),
    ADD COLUMN IF NOT EXISTS purchase_date     date,
    ADD COLUMN IF NOT EXISTS registration_date date;
