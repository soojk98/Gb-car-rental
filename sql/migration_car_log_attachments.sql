-- =====================================================================
-- Attachments for car logs
-- maintenance: invoice
-- summons:     summons document
-- accidents:   police report + insurance report
-- =====================================================================

ALTER TABLE public.mileage_logs
    ADD COLUMN IF NOT EXISTS attachment_path text;

ALTER TABLE public.maintenance_records
    ADD COLUMN IF NOT EXISTS attachment_path text;

ALTER TABLE public.summons
    ADD COLUMN IF NOT EXISTS attachment_path text;

ALTER TABLE public.accidents
    ADD COLUMN IF NOT EXISTS police_report_path text,
    ADD COLUMN IF NOT EXISTS insurance_report_path text;


-- Single private bucket for all car-log attachments.
INSERT INTO storage.buckets (id, name, public)
VALUES ('car-logs', 'car-logs', false)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "car logs admin all" ON storage.objects;
CREATE POLICY "car logs admin all"
    ON storage.objects FOR ALL TO authenticated
    USING (bucket_id = 'car-logs' AND public.is_admin())
    WITH CHECK (bucket_id = 'car-logs' AND public.is_admin());
