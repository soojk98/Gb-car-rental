-- =====================================================================
-- Financial documents module
-- Yearly statement / tax computation / tax return uploads.
-- Admin-only; files live in 'financial-documents' bucket.
-- =====================================================================

CREATE TABLE IF NOT EXISTS public.financial_documents (
    id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    year         int  NOT NULL,
    type         text NOT NULL CHECK (type IN ('financial_statement', 'tax_computation', 'tax_return')),
    file_path    text NOT NULL,
    notes        text,
    uploaded_by  uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
    uploaded_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS financial_documents_year_idx ON public.financial_documents (year);
CREATE INDEX IF NOT EXISTS financial_documents_type_idx ON public.financial_documents (type);

ALTER TABLE public.financial_documents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS financial_documents_admin_all ON public.financial_documents;
CREATE POLICY financial_documents_admin_all ON public.financial_documents
    FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

INSERT INTO storage.buckets (id, name, public)
VALUES ('financial-documents', 'financial-documents', false)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "financial docs admin all" ON storage.objects;
CREATE POLICY "financial docs admin all"
    ON storage.objects FOR ALL TO authenticated
    USING (bucket_id = 'financial-documents' AND public.is_admin())
    WITH CHECK (bucket_id = 'financial-documents' AND public.is_admin());
