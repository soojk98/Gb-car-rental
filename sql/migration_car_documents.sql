-- =====================================================================
-- GB Car Rental — car documents migration
-- =====================================================================
-- Adds a car_documents table for admin to upload registration card,
-- road tax, puspakom, and insurance documents per car. Files live in
-- a private 'car-documents' storage bucket under <car_id>/...
--
-- Apply in the Supabase SQL Editor (idempotent — safe to re-run).
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. car_documents table
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.car_documents (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    car_id      uuid NOT NULL REFERENCES public.cars(id) ON DELETE CASCADE,
    type        text NOT NULL CHECK (type IN ('registration', 'road_tax', 'puspakom', 'insurance')),
    file_path   text NOT NULL,
    notes       text,
    uploaded_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
    uploaded_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS car_documents_car_idx  ON public.car_documents (car_id);
CREATE INDEX IF NOT EXISTS car_documents_type_idx ON public.car_documents (type);


-- ---------------------------------------------------------------------
-- 2. RLS — admin full, drivers can SELECT for the car they're renting
-- ---------------------------------------------------------------------
ALTER TABLE public.car_documents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS car_documents_admin_all ON public.car_documents;
CREATE POLICY car_documents_admin_all ON public.car_documents
    FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS car_documents_driver_select ON public.car_documents;
CREATE POLICY car_documents_driver_select ON public.car_documents
    FOR SELECT USING (public.driver_owns_car(car_id));


-- ---------------------------------------------------------------------
-- 3. Storage bucket for car documents
-- ---------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public)
VALUES ('car-documents', 'car-documents', false)
ON CONFLICT (id) DO NOTHING;


-- ---------------------------------------------------------------------
-- 4. Storage policies
-- Files are uploaded under path:  <car_id>/<filename>
-- ---------------------------------------------------------------------
DROP POLICY IF EXISTS car_docs_admin_all ON storage.objects;
CREATE POLICY car_docs_admin_all ON storage.objects
    FOR ALL TO authenticated
    USING (bucket_id = 'car-documents' AND public.is_admin())
    WITH CHECK (bucket_id = 'car-documents' AND public.is_admin());

DROP POLICY IF EXISTS car_docs_driver_select ON storage.objects;
CREATE POLICY car_docs_driver_select ON storage.objects
    FOR SELECT TO authenticated
    USING (
        bucket_id = 'car-documents'
        AND EXISTS (
            SELECT 1 FROM public.rentals r
            WHERE r.car_id::text = (storage.foldername(name))[1]
              AND r.status = 'active'
              AND r.driver_id = public.current_driver_id()
        )
    );
