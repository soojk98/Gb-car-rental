-- Adds optional expiry tracking to car_documents so the driver portal
-- can show "Valid until X / 30 days left / Expired" on vehicle compliance.

ALTER TABLE public.car_documents
    ADD COLUMN IF NOT EXISTS expiry_date date;
