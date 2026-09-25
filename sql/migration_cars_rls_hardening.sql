-- =====================================================================
-- Harden read access to public.cars
--
-- PROBLEM
--   schema.sql:523-525 created:
--       CREATE POLICY cars_public_select ON public.cars
--           FOR SELECT TO anon, authenticated USING (true);
--
--   That grants every anonymous caller SELECT on EVERY column of the
--   table. The anon key is published in js/supabase.js because the
--   public pages need it, so in practice anyone on the internet could
--   read the whole fleet: all 97 plate_number values, purchase_price,
--   purchase_date, registration_date, current_mileage and notes.
--   Verified against the live project on 2026-09-25 - 4 cars already
--   had a purchase_price recorded and it was readable unauthenticated.
--
-- WHY IT WAS THERE
--   Presumably for a live "cars available" counter on the landing page.
--   Nothing uses it: index.html, login.html and public-pay.html make no
--   query against cars. public-pay.html reaches rentals only through
--   submit_public_payment(), which is SECURITY DEFINER and so does not
--   depend on this policy.
--
-- WHAT STILL NEEDS READ ACCESS
--   driver/payments.html:95 embeds cars(plate_number, model) from the
--   driver's own rentals, so authenticated drivers must keep a scoped
--   read. Admin access is unchanged via cars_admin_all.
--
-- AFTER THIS MIGRATION
--   anon           -> no access to cars at all
--   driver         -> only cars attached to one of their own rentals
--   admin          -> unchanged (cars_admin_all)
-- =====================================================================

-- 1. Remove the blanket public read.
DROP POLICY IF EXISTS cars_public_select ON public.cars;

-- 2. Give drivers a row-scoped read of the cars they actually rent.
--    Mirrors the existing rentals_select_own pattern (schema.sql:551-553).
DROP POLICY IF EXISTS cars_driver_select ON public.cars;
CREATE POLICY cars_driver_select ON public.cars
    FOR SELECT
    USING (
        public.is_admin()
        OR EXISTS (
            SELECT 1
            FROM public.rentals r
            WHERE r.car_id = cars.id
              AND r.driver_id = public.current_driver_id()
        )
    );

-- rentals_car_idx already exists (schema.sql), so the EXISTS above is indexed.

-- 3. Stop submit_public_payment() confirming which plates exist.
--    The old message echoed the plate back on failure, which let an
--    anonymous caller enumerate plate numbers one guess at a time.
--    Same behaviour for the legitimate user, no oracle for anyone else.
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
        RAISE EXCEPTION 'We could not match that plate to an active rental. Please check the number, or WhatsApp us at 016-365 2235.';
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

-- =====================================================================
-- IF YOU EVER WANT A PUBLIC "CARS AVAILABLE" COUNT
--   Do NOT reopen the table. Expose a view with only safe columns:
--
--     CREATE OR REPLACE VIEW public.cars_public AS
--         SELECT model, weekly_rate, status FROM public.cars;
--     GRANT SELECT ON public.cars_public TO anon;
--
--   The view runs as its owner, so it reads the base table without the
--   caller needing a policy on it, and it cannot expose a column that
--   is not listed. Note the landing page deliberately does not use a
--   live count today: utilisation is ~96%, so it would usually read 0.
-- =====================================================================
