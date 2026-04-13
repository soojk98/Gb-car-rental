-- =====================================================================
-- Approval workflow for driver-uploaded documents
-- Driver uploads (NRIC, license, PSV, bills) start as 'pending' and
-- need admin approval. Admin uploads on behalf of driver default to
-- 'approved'.
-- =====================================================================

ALTER TABLE public.documents
    ADD COLUMN IF NOT EXISTS status       text NOT NULL DEFAULT 'pending',
    ADD COLUMN IF NOT EXISTS review_notes text;

-- Existing documents are assumed already accepted; mark them approved
-- so the driver portal does not suddenly show old files as pending.
UPDATE public.documents SET status = 'approved' WHERE status = 'pending';

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'documents_status_check'
    ) THEN
        ALTER TABLE public.documents
            ADD CONSTRAINT documents_status_check
            CHECK (status IN ('pending', 'approved', 'rejected'));
    END IF;
END $$;

-- Replace insert policy so drivers can only create pending rows.
DROP POLICY IF EXISTS documents_insert_own ON public.documents;
CREATE POLICY documents_insert_own ON public.documents
    FOR INSERT WITH CHECK (
        public.is_admin() OR (
            status = 'pending' AND driver_id = public.current_driver_id()
        )
    );
