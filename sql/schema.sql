-- =====================================================================
-- GB Car Rental — Database Schema
-- =====================================================================
-- Apply this in the Supabase SQL Editor:
--   1. Open your project at https://app.supabase.com
--   2. Click "SQL Editor" in the left sidebar
--   3. Click "New query"
--   4. Paste this entire file
--   5. Click "Run"
--
-- This file is idempotent — safe to re-run if something fails partway.
-- =====================================================================

-- ---------------------------------------------------------------------
-- Extensions
-- ---------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS "pgcrypto";


-- =====================================================================
-- TABLE: profiles
-- Extends auth.users with a role and display name.
-- A row is auto-created when a user signs up (see trigger below).
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.profiles (
    id          uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    role        text NOT NULL CHECK (role IN ('admin', 'driver')),
    full_name   text,
    created_at  timestamptz NOT NULL DEFAULT now()
);


-- =====================================================================
-- TABLE: leads
-- Submissions from the public landing-page form.
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.leads (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    full_name       text NOT NULL,
    whatsapp        text NOT NULL,
    preferred_car   text,
    status          text NOT NULL DEFAULT 'new'
                    CHECK (status IN ('new', 'contacted', 'converted', 'rejected')),
    notes           text,
    created_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS leads_status_idx ON public.leads (status);
CREATE INDEX IF NOT EXISTS leads_created_at_idx ON public.leads (created_at DESC);


-- =====================================================================
-- TABLE: cars
-- Your fleet.
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.cars (
    id                          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    model                       text NOT NULL,
    plate_number                text NOT NULL UNIQUE,
    year                        int,
    color                       text,
    weekly_rate                 numeric(10, 2) NOT NULL,
    status                      text NOT NULL DEFAULT 'available'
                                CHECK (status IN ('available', 'rented', 'maintenance', 'retired')),
    current_mileage             int DEFAULT 0,
    next_service_due_date       date,
    next_service_due_mileage    int,
    notes                       text,
    created_at                  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS cars_status_idx ON public.cars (status);


-- =====================================================================
-- TABLE: drivers
-- Approved drivers (separate from profiles so you can record drivers
-- before they sign up for an account).
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.drivers (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id      uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
    lead_id         uuid REFERENCES public.leads(id) ON DELETE SET NULL,
    full_name       text NOT NULL,
    ic_number       text,
    whatsapp        text,
    license_number  text,
    psv_number      text,
    address         text,
    status          text NOT NULL DEFAULT 'active'
                    CHECK (status IN ('active', 'inactive', 'blacklisted')),
    notes           text,
    created_at      timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS drivers_profile_id_idx ON public.drivers (profile_id) WHERE profile_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS drivers_status_idx ON public.drivers (status);


-- =====================================================================
-- TABLE: rentals
-- Links a driver to a car for a period of time.
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.rentals (
    id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    driver_id           uuid NOT NULL REFERENCES public.drivers(id) ON DELETE RESTRICT,
    car_id              uuid NOT NULL REFERENCES public.cars(id) ON DELETE RESTRICT,
    start_date          date NOT NULL,
    end_date            date,
    weekly_rate         numeric(10, 2) NOT NULL,
    deposit_amount      numeric(10, 2) DEFAULT 0,
    deposit_returned    boolean DEFAULT false,
    status              text NOT NULL DEFAULT 'active'
                        CHECK (status IN ('active', 'ended')),
    notes               text,
    created_at          timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS rentals_driver_idx ON public.rentals (driver_id);
CREATE INDEX IF NOT EXISTS rentals_car_idx ON public.rentals (car_id);
CREATE INDEX IF NOT EXISTS rentals_status_idx ON public.rentals (status);


-- =====================================================================
-- TABLE: payments
-- Weekly rental payments.
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.payments (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    rental_id       uuid NOT NULL REFERENCES public.rentals(id) ON DELETE CASCADE,
    amount          numeric(10, 2) NOT NULL,
    paid_at         date NOT NULL,
    period_start    date,
    period_end      date,
    method          text CHECK (method IN ('cash', 'transfer', 'cheque', 'other')),
    notes           text,
    created_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS payments_rental_idx ON public.payments (rental_id);


-- =====================================================================
-- TABLE: documents
-- Driver documents (NRIC, license, PSV) — files live in Supabase Storage.
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.documents (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    driver_id   uuid NOT NULL REFERENCES public.drivers(id) ON DELETE CASCADE,
    type        text NOT NULL CHECK (type IN ('nric', 'license', 'psv', 'other')),
    file_path   text NOT NULL,
    uploaded_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS documents_driver_idx ON public.documents (driver_id);


-- =====================================================================
-- TABLE: summons
-- Traffic summons issued to a car/driver.
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.summons (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    car_id          uuid NOT NULL REFERENCES public.cars(id) ON DELETE RESTRICT,
    driver_id       uuid REFERENCES public.drivers(id) ON DELETE SET NULL,
    summon_number   text,
    offense         text,
    location        text,
    summon_date     date NOT NULL,
    fine_amount     numeric(10, 2),
    status          text NOT NULL DEFAULT 'unpaid'
                    CHECK (status IN ('unpaid', 'paid', 'disputed')),
    paid_at         date,
    paid_by         text CHECK (paid_by IN ('driver', 'company')),
    notes           text,
    logged_by       uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS summons_car_idx ON public.summons (car_id);
CREATE INDEX IF NOT EXISTS summons_driver_idx ON public.summons (driver_id);
CREATE INDEX IF NOT EXISTS summons_status_idx ON public.summons (status);


-- =====================================================================
-- TABLE: insurance_policies
-- Car insurance you've purchased (with expiry tracking).
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.insurance_policies (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    car_id          uuid NOT NULL REFERENCES public.cars(id) ON DELETE CASCADE,
    provider        text NOT NULL,
    policy_number   text,
    coverage_type   text CHECK (coverage_type IN ('comprehensive', 'third_party', 'third_party_fire_theft')),
    premium         numeric(10, 2),
    start_date      date NOT NULL,
    end_date        date NOT NULL,
    notes           text,
    created_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS insurance_car_idx ON public.insurance_policies (car_id);
CREATE INDEX IF NOT EXISTS insurance_end_date_idx ON public.insurance_policies (end_date);


-- =====================================================================
-- TABLE: road_tax
-- Road tax payments per car (with expiry tracking).
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.road_tax (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    car_id      uuid NOT NULL REFERENCES public.cars(id) ON DELETE CASCADE,
    amount      numeric(10, 2) NOT NULL,
    paid_date   date NOT NULL,
    start_date  date NOT NULL,
    end_date    date NOT NULL,
    notes       text,
    created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS road_tax_car_idx ON public.road_tax (car_id);
CREATE INDEX IF NOT EXISTS road_tax_end_date_idx ON public.road_tax (end_date);


-- =====================================================================
-- TABLE: puspakom_inspections
-- Puspakom (Malaysian vehicle inspection) records.
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.puspakom_inspections (
    id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    car_id              uuid NOT NULL REFERENCES public.cars(id) ON DELETE CASCADE,
    inspection_date     date NOT NULL,
    result              text CHECK (result IN ('pass', 'fail', 'pending')),
    expiry_date         date,
    cost                numeric(10, 2),
    notes               text,
    created_at          timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS puspakom_car_idx ON public.puspakom_inspections (car_id);
CREATE INDEX IF NOT EXISTS puspakom_expiry_idx ON public.puspakom_inspections (expiry_date);


-- =====================================================================
-- TABLE: maintenance_records
-- Servicing, oil changes, parts replacements, repairs — one table.
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.maintenance_records (
    id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    car_id                  uuid NOT NULL REFERENCES public.cars(id) ON DELETE CASCADE,
    type                    text NOT NULL
                            CHECK (type IN ('service', 'oil_change', 'parts_replacement', 'repair', 'inspection', 'other')),
    service_date            date NOT NULL,
    mileage_at_service      int,
    workshop                text,
    description             text,
    parts_used              text,
    oil_brand               text,
    oil_quantity_litres     numeric(5, 2),
    cost                    numeric(10, 2),
    next_service_date       date,
    next_service_mileage    int,
    logged_by               uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
    notes                   text,
    created_at              timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS maintenance_car_idx ON public.maintenance_records (car_id);
CREATE INDEX IF NOT EXISTS maintenance_type_idx ON public.maintenance_records (type);
CREATE INDEX IF NOT EXISTS maintenance_date_idx ON public.maintenance_records (service_date DESC);


-- =====================================================================
-- TABLE: mileage_logs
-- Periodic odometer readings.
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.mileage_logs (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    car_id          uuid NOT NULL REFERENCES public.cars(id) ON DELETE CASCADE,
    odometer_km     int NOT NULL,
    recorded_date   date NOT NULL,
    logged_by       uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
    notes           text,
    created_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS mileage_car_idx ON public.mileage_logs (car_id);


-- =====================================================================
-- TABLE: accidents
-- Accident / incident reports.
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.accidents (
    id                          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    car_id                      uuid NOT NULL REFERENCES public.cars(id) ON DELETE RESTRICT,
    driver_id                   uuid REFERENCES public.drivers(id) ON DELETE SET NULL,
    incident_date               date NOT NULL,
    location                    text,
    description                 text NOT NULL,
    damage_description          text,
    severity                    text CHECK (severity IN ('minor', 'moderate', 'major', 'total_loss')),
    reported_to_insurance       boolean DEFAULT false,
    insurance_claim_number      text,
    repair_cost                 numeric(10, 2),
    status                      text NOT NULL DEFAULT 'reported'
                                CHECK (status IN ('reported', 'under_repair', 'resolved', 'closed')),
    notes                       text,
    logged_by                   uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at                  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS accidents_car_idx ON public.accidents (car_id);
CREATE INDEX IF NOT EXISTS accidents_driver_idx ON public.accidents (driver_id);
CREATE INDEX IF NOT EXISTS accidents_status_idx ON public.accidents (status);


-- =====================================================================
-- TABLE: parts (inventory)
-- Master list of spare parts you keep in stock.
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.parts (
    id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name                text NOT NULL,
    part_number         text,
    category            text,
    current_stock       int NOT NULL DEFAULT 0,
    unit_cost           numeric(10, 2),
    supplier            text,
    reorder_threshold   int DEFAULT 0,
    notes               text,
    created_at          timestamptz NOT NULL DEFAULT now(),
    updated_at          timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS parts_category_idx ON public.parts (category);


-- =====================================================================
-- TABLE: part_movements
-- Audit trail of every stock change (purchase, used, adjustment).
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.part_movements (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    part_id         uuid NOT NULL REFERENCES public.parts(id) ON DELETE CASCADE,
    movement_type   text NOT NULL CHECK (movement_type IN ('purchase', 'used', 'adjustment', 'return')),
    quantity        int NOT NULL,  -- always positive; movement_type tells direction
    unit_cost       numeric(10, 2),
    maintenance_id  uuid REFERENCES public.maintenance_records(id) ON DELETE SET NULL,
    reason          text,
    performed_by    uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS part_movements_part_idx ON public.part_movements (part_id);


-- =====================================================================
-- HELPER FUNCTIONS (used by RLS policies)
-- =====================================================================

-- Returns true if the current logged-in user has the admin role.
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND role = 'admin'
    );
$$;

-- Returns the driver_id of the currently logged-in driver (or NULL).
CREATE OR REPLACE FUNCTION public.current_driver_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT id FROM public.drivers WHERE profile_id = auth.uid() LIMIT 1;
$$;

-- Returns true if the current logged-in driver has an active rental for the given car.
CREATE OR REPLACE FUNCTION public.driver_owns_car(check_car_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.rentals r
        WHERE r.car_id = check_car_id
          AND r.status = 'active'
          AND r.driver_id = public.current_driver_id()
    );
$$;


-- =====================================================================
-- TRIGGER: auto-create profile on user signup
-- Auto-promotes the configured admin email to the 'admin' role.
-- =====================================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    INSERT INTO public.profiles (id, role, full_name)
    VALUES (
        NEW.id,
        CASE
            WHEN NEW.email = 'soojingkai2a@gmail.com' THEN 'admin'
            ELSE 'driver'
        END,
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email)
    );
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


-- =====================================================================
-- TRIGGER: keep cars.current_mileage up to date when mileage logged
-- =====================================================================
CREATE OR REPLACE FUNCTION public.update_car_mileage_from_log()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    UPDATE public.cars
    SET current_mileage = NEW.odometer_km
    WHERE id = NEW.car_id
      AND (current_mileage IS NULL OR NEW.odometer_km > current_mileage);
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS mileage_log_updates_car ON public.mileage_logs;
CREATE TRIGGER mileage_log_updates_car
AFTER INSERT ON public.mileage_logs
FOR EACH ROW EXECUTE FUNCTION public.update_car_mileage_from_log();


-- =====================================================================
-- TRIGGER: keep parts.current_stock in sync with part_movements
-- =====================================================================
CREATE OR REPLACE FUNCTION public.apply_part_movement()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    IF NEW.movement_type IN ('purchase', 'return') THEN
        UPDATE public.parts SET current_stock = current_stock + NEW.quantity, updated_at = now()
        WHERE id = NEW.part_id;
    ELSIF NEW.movement_type = 'used' THEN
        UPDATE public.parts SET current_stock = current_stock - NEW.quantity, updated_at = now()
        WHERE id = NEW.part_id;
    ELSIF NEW.movement_type = 'adjustment' THEN
        -- adjustment quantity may be positive or negative; we store positive,
        -- so adjustments must be split into 'purchase' or 'used'. No-op here.
        NULL;
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS apply_part_movement_trigger ON public.part_movements;
CREATE TRIGGER apply_part_movement_trigger
AFTER INSERT ON public.part_movements
FOR EACH ROW EXECUTE FUNCTION public.apply_part_movement();


-- =====================================================================
-- ROW-LEVEL SECURITY
-- =====================================================================
ALTER TABLE public.profiles              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leads                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cars                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.drivers               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rentals               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.summons               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.insurance_policies    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.road_tax              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.puspakom_inspections  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.maintenance_records   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mileage_logs          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accidents             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.parts                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.part_movements        ENABLE ROW LEVEL SECURITY;


-- ---------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------
DROP POLICY IF EXISTS profiles_select_own ON public.profiles;
CREATE POLICY profiles_select_own ON public.profiles
    FOR SELECT USING (id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS profiles_update_own ON public.profiles;
CREATE POLICY profiles_update_own ON public.profiles
    FOR UPDATE USING (id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS profiles_admin_all ON public.profiles;
CREATE POLICY profiles_admin_all ON public.profiles
    FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());


-- ---------------------------------------------------------------------
-- leads — public can INSERT, only admin can read/update
-- ---------------------------------------------------------------------
DROP POLICY IF EXISTS leads_public_insert ON public.leads;
CREATE POLICY leads_public_insert ON public.leads
    FOR INSERT TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS leads_admin_all ON public.leads;
CREATE POLICY leads_admin_all ON public.leads
    FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());


-- ---------------------------------------------------------------------
-- cars — admin full, drivers can read (so they see their car details)
-- Public/anon can also SELECT (the landing page lists the fleet).
-- ---------------------------------------------------------------------
DROP POLICY IF EXISTS cars_public_select ON public.cars;
CREATE POLICY cars_public_select ON public.cars
    FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS cars_admin_all ON public.cars;
CREATE POLICY cars_admin_all ON public.cars
    FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());


-- ---------------------------------------------------------------------
-- drivers — admin full, drivers can read/update own row
-- ---------------------------------------------------------------------
DROP POLICY IF EXISTS drivers_select_own ON public.drivers;
CREATE POLICY drivers_select_own ON public.drivers
    FOR SELECT USING (profile_id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS drivers_update_own ON public.drivers;
CREATE POLICY drivers_update_own ON public.drivers
    FOR UPDATE USING (profile_id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS drivers_admin_all ON public.drivers;
CREATE POLICY drivers_admin_all ON public.drivers
    FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());


-- ---------------------------------------------------------------------
-- rentals — admin full, drivers can read their own
-- ---------------------------------------------------------------------
DROP POLICY IF EXISTS rentals_select_own ON public.rentals;
CREATE POLICY rentals_select_own ON public.rentals
    FOR SELECT USING (driver_id = public.current_driver_id() OR public.is_admin());

DROP POLICY IF EXISTS rentals_admin_all ON public.rentals;
CREATE POLICY rentals_admin_all ON public.rentals
    FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());


-- ---------------------------------------------------------------------
-- payments — admin full, drivers can read their own (via rentals)
-- ---------------------------------------------------------------------
DROP POLICY IF EXISTS payments_select_own ON public.payments;
CREATE POLICY payments_select_own ON public.payments
    FOR SELECT USING (
        public.is_admin() OR EXISTS (
            SELECT 1 FROM public.rentals r
            WHERE r.id = payments.rental_id
              AND r.driver_id = public.current_driver_id()
        )
    );

DROP POLICY IF EXISTS payments_admin_all ON public.payments;
CREATE POLICY payments_admin_all ON public.payments
    FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());


-- ---------------------------------------------------------------------
-- documents — admin full, drivers can read/insert own
-- ---------------------------------------------------------------------
DROP POLICY IF EXISTS documents_select_own ON public.documents;
CREATE POLICY documents_select_own ON public.documents
    FOR SELECT USING (driver_id = public.current_driver_id() OR public.is_admin());

DROP POLICY IF EXISTS documents_insert_own ON public.documents;
CREATE POLICY documents_insert_own ON public.documents
    FOR INSERT WITH CHECK (driver_id = public.current_driver_id() OR public.is_admin());

DROP POLICY IF EXISTS documents_admin_all ON public.documents;
CREATE POLICY documents_admin_all ON public.documents
    FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());


-- ---------------------------------------------------------------------
-- summons — admin full, drivers can read/insert for their assigned car
-- ---------------------------------------------------------------------
DROP POLICY IF EXISTS summons_select_own ON public.summons;
CREATE POLICY summons_select_own ON public.summons
    FOR SELECT USING (public.is_admin() OR public.driver_owns_car(car_id));

DROP POLICY IF EXISTS summons_insert_own ON public.summons;
CREATE POLICY summons_insert_own ON public.summons
    FOR INSERT WITH CHECK (public.is_admin() OR public.driver_owns_car(car_id));

DROP POLICY IF EXISTS summons_admin_all ON public.summons;
CREATE POLICY summons_admin_all ON public.summons
    FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());


-- ---------------------------------------------------------------------
-- insurance_policies — admin full, drivers can SELECT their assigned car
-- ---------------------------------------------------------------------
DROP POLICY IF EXISTS insurance_select_own ON public.insurance_policies;
CREATE POLICY insurance_select_own ON public.insurance_policies
    FOR SELECT USING (public.is_admin() OR public.driver_owns_car(car_id));

DROP POLICY IF EXISTS insurance_admin_all ON public.insurance_policies;
CREATE POLICY insurance_admin_all ON public.insurance_policies
    FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());


-- ---------------------------------------------------------------------
-- road_tax — admin full, drivers can SELECT their assigned car
-- ---------------------------------------------------------------------
DROP POLICY IF EXISTS road_tax_select_own ON public.road_tax;
CREATE POLICY road_tax_select_own ON public.road_tax
    FOR SELECT USING (public.is_admin() OR public.driver_owns_car(car_id));

DROP POLICY IF EXISTS road_tax_admin_all ON public.road_tax;
CREATE POLICY road_tax_admin_all ON public.road_tax
    FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());


-- ---------------------------------------------------------------------
-- puspakom_inspections — admin full, drivers can SELECT their assigned car
-- ---------------------------------------------------------------------
DROP POLICY IF EXISTS puspakom_select_own ON public.puspakom_inspections;
CREATE POLICY puspakom_select_own ON public.puspakom_inspections
    FOR SELECT USING (public.is_admin() OR public.driver_owns_car(car_id));

DROP POLICY IF EXISTS puspakom_admin_all ON public.puspakom_inspections;
CREATE POLICY puspakom_admin_all ON public.puspakom_inspections
    FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());


-- ---------------------------------------------------------------------
-- maintenance_records — admin full, drivers can read/insert for own car
-- ---------------------------------------------------------------------
DROP POLICY IF EXISTS maintenance_select_own ON public.maintenance_records;
CREATE POLICY maintenance_select_own ON public.maintenance_records
    FOR SELECT USING (public.is_admin() OR public.driver_owns_car(car_id));

DROP POLICY IF EXISTS maintenance_insert_own ON public.maintenance_records;
CREATE POLICY maintenance_insert_own ON public.maintenance_records
    FOR INSERT WITH CHECK (public.is_admin() OR public.driver_owns_car(car_id));

DROP POLICY IF EXISTS maintenance_admin_all ON public.maintenance_records;
CREATE POLICY maintenance_admin_all ON public.maintenance_records
    FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());


-- ---------------------------------------------------------------------
-- mileage_logs — admin full, drivers can read/insert for own car
-- ---------------------------------------------------------------------
DROP POLICY IF EXISTS mileage_select_own ON public.mileage_logs;
CREATE POLICY mileage_select_own ON public.mileage_logs
    FOR SELECT USING (public.is_admin() OR public.driver_owns_car(car_id));

DROP POLICY IF EXISTS mileage_insert_own ON public.mileage_logs;
CREATE POLICY mileage_insert_own ON public.mileage_logs
    FOR INSERT WITH CHECK (public.is_admin() OR public.driver_owns_car(car_id));

DROP POLICY IF EXISTS mileage_admin_all ON public.mileage_logs;
CREATE POLICY mileage_admin_all ON public.mileage_logs
    FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());


-- ---------------------------------------------------------------------
-- accidents — admin full, drivers can read/insert for own car
-- ---------------------------------------------------------------------
DROP POLICY IF EXISTS accidents_select_own ON public.accidents;
CREATE POLICY accidents_select_own ON public.accidents
    FOR SELECT USING (public.is_admin() OR public.driver_owns_car(car_id));

DROP POLICY IF EXISTS accidents_insert_own ON public.accidents;
CREATE POLICY accidents_insert_own ON public.accidents
    FOR INSERT WITH CHECK (public.is_admin() OR public.driver_owns_car(car_id));

DROP POLICY IF EXISTS accidents_admin_all ON public.accidents;
CREATE POLICY accidents_admin_all ON public.accidents
    FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());


-- ---------------------------------------------------------------------
-- parts — admin only (drivers don't manage inventory)
-- ---------------------------------------------------------------------
DROP POLICY IF EXISTS parts_admin_all ON public.parts;
CREATE POLICY parts_admin_all ON public.parts
    FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS part_movements_admin_all ON public.part_movements;
CREATE POLICY part_movements_admin_all ON public.part_movements
    FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());


-- =====================================================================
-- STORAGE: bucket for driver documents (private)
-- =====================================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('driver-documents', 'driver-documents', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies: drivers can upload to their own folder, admins can do anything.
-- Files should be uploaded under path:  <driver_id>/<filename>
DROP POLICY IF EXISTS docs_admin_all ON storage.objects;
CREATE POLICY docs_admin_all ON storage.objects
    FOR ALL TO authenticated
    USING (bucket_id = 'driver-documents' AND public.is_admin())
    WITH CHECK (bucket_id = 'driver-documents' AND public.is_admin());

DROP POLICY IF EXISTS docs_driver_select_own ON storage.objects;
CREATE POLICY docs_driver_select_own ON storage.objects
    FOR SELECT TO authenticated
    USING (
        bucket_id = 'driver-documents'
        AND (storage.foldername(name))[1] = public.current_driver_id()::text
    );

DROP POLICY IF EXISTS docs_driver_insert_own ON storage.objects;
CREATE POLICY docs_driver_insert_own ON storage.objects
    FOR INSERT TO authenticated
    WITH CHECK (
        bucket_id = 'driver-documents'
        AND (storage.foldername(name))[1] = public.current_driver_id()::text
    );


-- =====================================================================
-- Done!
-- =====================================================================
