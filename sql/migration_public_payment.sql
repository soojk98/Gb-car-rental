-- =====================================================================
-- Public (no-login) payment submission
-- Admin shares a link; driver keys in plate number + uploads slip.
-- Creates a pending payment on the active rental for that plate.
-- =====================================================================

-- 1. Track which bucket holds each payment slip (so the public flow
--    can use a separate public bucket).
ALTER TABLE public.payments
    ADD COLUMN IF NOT EXISTS slip_bucket text NOT NULL DEFAULT 'driver-documents';


-- 2. Public bucket for slips submitted without login.
INSERT INTO storage.buckets (id, name, public)
VALUES ('payment-slips', 'payment-slips', true)
ON CONFLICT (id) DO NOTHING;


-- 3. Storage policies — anon can upload, anyone can read.
DROP POLICY IF EXISTS "payment slips anon insert" ON storage.objects;
CREATE POLICY "payment slips anon insert"
    ON storage.objects FOR INSERT TO anon, authenticated
    WITH CHECK (bucket_id = 'payment-slips');

DROP POLICY IF EXISTS "payment slips public read" ON storage.objects;
CREATE POLICY "payment slips public read"
    ON storage.objects FOR SELECT TO anon, authenticated
    USING (bucket_id = 'payment-slips');


-- 4. RPC invoked by the public page. SECURITY DEFINER bypasses RLS so
--    anon can insert a pending payment tied to the matching active rental.
CREATE OR REPLACE FUNCTION public.submit_public_payment(
    p_plate        text,
    p_amount       numeric,
    p_paid_at      date,
    p_period_start date,
    p_period_end   date,
    p_method       text,
    p_notes        text,
    p_slip_path    text
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_rental_id  uuid;
    v_payment_id uuid;
    v_plate_norm text := upper(regexp_replace(coalesce(p_plate, ''), '\s', '', 'g'));
BEGIN
    IF v_plate_norm = '' THEN
        RAISE EXCEPTION 'Plate number is required';
    END IF;
    IF p_amount IS NULL OR p_amount <= 0 THEN
        RAISE EXCEPTION 'Amount must be greater than zero';
    END IF;

    SELECT r.id INTO v_rental_id
    FROM public.rentals r
    JOIN public.cars    c ON c.id = r.car_id
    WHERE upper(regexp_replace(c.plate_number, '\s', '', 'g')) = v_plate_norm
      AND r.status = 'active'
    LIMIT 1;

    IF v_rental_id IS NULL THEN
        RAISE EXCEPTION 'No active rental found for plate %', p_plate;
    END IF;

    INSERT INTO public.payments (
        rental_id, amount, paid_at, period_start, period_end,
        method, notes, slip_path, slip_bucket, status
    ) VALUES (
        v_rental_id, p_amount, p_paid_at, p_period_start, p_period_end,
        p_method, p_notes, p_slip_path, 'payment-slips', 'pending'
    )
    RETURNING id INTO v_payment_id;

    RETURN v_payment_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.submit_public_payment(text, numeric, date, date, date, text, text, text)
    TO anon, authenticated;
