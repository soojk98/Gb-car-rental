-- Adds optional photo paths (front / back / side) on cars.
-- Files are stored in the existing 'car-documents' bucket under
-- <car_id>/photos/<front|back|side>_<timestamp>_<filename>.

ALTER TABLE public.cars
    ADD COLUMN IF NOT EXISTS photo_front_path text,
    ADD COLUMN IF NOT EXISTS photo_back_path  text,
    ADD COLUMN IF NOT EXISTS photo_side_path  text;
