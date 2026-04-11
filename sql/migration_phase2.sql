-- =====================================================================
-- GB Car Rental — Phase 2 migration
-- =====================================================================
-- Adds email tracking, deposit-onboarding fields, and auto-links new
-- auth users to pre-created driver records by matching email.
--
-- Apply in the Supabase SQL Editor (idempotent — safe to re-run).
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Email columns
-- ---------------------------------------------------------------------
ALTER TABLE public.leads   ADD COLUMN IF NOT EXISTS email text;
ALTER TABLE public.drivers ADD COLUMN IF NOT EXISTS email text;

CREATE INDEX IF NOT EXISTS drivers_email_idx ON public.drivers (email);


-- ---------------------------------------------------------------------
-- 2. Deposit-onboarding columns on drivers
-- ---------------------------------------------------------------------
ALTER TABLE public.drivers ADD COLUMN IF NOT EXISTS deposit_amount_paid numeric(10, 2);
ALTER TABLE public.drivers ADD COLUMN IF NOT EXISTS deposit_paid_at     timestamptz;
ALTER TABLE public.drivers ADD COLUMN IF NOT EXISTS deposit_slip_path   text;
ALTER TABLE public.drivers ADD COLUMN IF NOT EXISTS deposit_status      text DEFAULT 'pending';
ALTER TABLE public.drivers ADD COLUMN IF NOT EXISTS deposit_notes       text;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'drivers_deposit_status_check'
    ) THEN
        ALTER TABLE public.drivers
            ADD CONSTRAINT drivers_deposit_status_check
            CHECK (deposit_status IN ('pending', 'submitted', 'approved', 'rejected'));
    END IF;
END $$;


-- ---------------------------------------------------------------------
-- 3. Updated auth trigger — auto-link new user to a pre-created driver
-- ---------------------------------------------------------------------
-- When admin invites a driver via magic link:
--   1. A drivers row is inserted (with email, no profile_id)
--   2. Magic link is sent
--   3. Driver clicks link → auth.users row is created → THIS trigger fires
--   4. We create the profile AND link the existing drivers row by email
--
-- If no matching driver row exists, the user just becomes a regular driver
-- with no driver record yet (admin can still link manually).
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    user_role text;
    user_full_name text;
BEGIN
    user_role := CASE
        WHEN NEW.email = 'soojingkai2a@gmail.com' THEN 'admin'
        ELSE 'driver'
    END;
    user_full_name := COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email);

    -- Create the profile row
    INSERT INTO public.profiles (id, role, full_name)
    VALUES (NEW.id, user_role, user_full_name);

    -- For drivers, attempt to link a pre-created driver record by email
    IF user_role = 'driver' THEN
        UPDATE public.drivers
        SET profile_id = NEW.id
        WHERE email = NEW.email
          AND profile_id IS NULL;
    END IF;

    RETURN NEW;
END;
$$;

-- Trigger already exists from the original schema; no need to recreate it.


-- ---------------------------------------------------------------------
-- 4. Allow drivers to UPDATE their own row (needed for deposit fields)
-- ---------------------------------------------------------------------
-- The original schema already had a drivers_update_own policy, but it's
-- worth making sure it's there.
DROP POLICY IF EXISTS drivers_update_own ON public.drivers;
CREATE POLICY drivers_update_own ON public.drivers
    FOR UPDATE USING (profile_id = auth.uid() OR public.is_admin())
    WITH CHECK (profile_id = auth.uid() OR public.is_admin());


-- =====================================================================
-- Done
-- =====================================================================
