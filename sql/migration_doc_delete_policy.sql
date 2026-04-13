-- =====================================================================
-- Allow drivers to delete their own document rows + storage files.
-- Needed so the "one document per type" replace-on-upload logic can
-- actually remove the previous row before inserting the new one.
-- =====================================================================

DROP POLICY IF EXISTS documents_delete_own ON public.documents;
CREATE POLICY documents_delete_own ON public.documents
    FOR DELETE USING (
        public.is_admin() OR driver_id = public.current_driver_id()
    );

DROP POLICY IF EXISTS driver_docs_driver_delete ON storage.objects;
CREATE POLICY driver_docs_driver_delete ON storage.objects
    FOR DELETE TO authenticated
    USING (
        bucket_id = 'driver-documents'
        AND (storage.foldername(name))[1] = public.current_driver_id()::text
    );
