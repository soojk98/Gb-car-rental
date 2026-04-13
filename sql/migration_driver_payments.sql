-- =====================================================================
-- Driver-submitted payments
-- Drivers can now record a payment themselves and upload a proof slip.
-- Admin reviews (approves/rejects) each submission.
-- =====================================================================

-- 1. New columns on payments
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS slip_path    text;
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS status       text NOT NULL DEFAULT 'approved';
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS review_notes text;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'payments_status_check'
    ) THEN
        ALTER TABLE public.payments
            ADD CONSTRAINT payments_status_check
            CHECK (status IN ('pending', 'approved', 'rejected'));
    END IF;
END $$;


-- 2. Allow drivers to INSERT payments for their own active rentals,
--    but only as status='pending' (admin still owns approve/reject).
DROP POLICY IF EXISTS payments_insert_own ON public.payments;
CREATE POLICY payments_insert_own ON public.payments
    FOR INSERT WITH CHECK (
        public.is_admin() OR (
            status = 'pending' AND EXISTS (
                SELECT 1 FROM public.rentals r
                WHERE r.id = payments.rental_id
                  AND r.driver_id = public.current_driver_id()
            )
        )
    );
