-- Adds car condition (new / used) on cars.

ALTER TABLE public.cars
    ADD COLUMN IF NOT EXISTS condition text CHECK (condition IN ('new', 'used'));
