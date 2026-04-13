-- =====================================================================
-- Inventory module
-- Tracks parts/consumables (oil filters, spare parts, etc.).
-- One table for items, one for stock movements (in/out/adjust).
-- A view aggregates current stock per item.
-- =====================================================================

CREATE TABLE IF NOT EXISTS public.inventory_items (
    id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name           text NOT NULL,
    sku            text,
    category       text,
    unit           text NOT NULL DEFAULT 'pcs',
    reorder_level  numeric(12, 2) NOT NULL DEFAULT 0,
    notes          text,
    created_at     timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.inventory_movements (
    id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    item_id        uuid NOT NULL REFERENCES public.inventory_items(id) ON DELETE CASCADE,
    movement_type  text NOT NULL CHECK (movement_type IN ('in', 'out', 'adjust')),
    quantity       numeric(12, 2) NOT NULL,
    unit_cost      numeric(12, 2),
    total_cost     numeric(12, 2),
    supplier       text,
    reference      text,
    car_id         uuid REFERENCES public.cars(id) ON DELETE SET NULL,
    bill_path      text,
    bill_bucket    text,
    notes          text,
    moved_at       date NOT NULL DEFAULT CURRENT_DATE,
    created_at     timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS inventory_movements_item_idx ON public.inventory_movements (item_id);

-- Current stock = sum of signed quantities. 'adjust' uses the signed
-- quantity directly so admins can correct counts with a positive or
-- negative delta.
CREATE OR REPLACE VIEW public.inventory_stock AS
SELECT
    i.id, i.name, i.sku, i.category, i.unit, i.reorder_level, i.notes, i.created_at,
    COALESCE(SUM(CASE
        WHEN m.movement_type = 'in'     THEN m.quantity
        WHEN m.movement_type = 'out'    THEN -m.quantity
        WHEN m.movement_type = 'adjust' THEN m.quantity
        ELSE 0
    END), 0) AS stock
FROM public.inventory_items i
LEFT JOIN public.inventory_movements m ON m.item_id = i.id
GROUP BY i.id;


-- RLS — admin only.
ALTER TABLE public.inventory_items     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_movements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS inventory_items_admin_all ON public.inventory_items;
CREATE POLICY inventory_items_admin_all ON public.inventory_items
    FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS inventory_movements_admin_all ON public.inventory_movements;
CREATE POLICY inventory_movements_admin_all ON public.inventory_movements
    FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());


-- Storage bucket for purchase bills (private; admin only).
INSERT INTO storage.buckets (id, name, public)
VALUES ('inventory-bills', 'inventory-bills', false)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "inventory bills admin all" ON storage.objects;
CREATE POLICY "inventory bills admin all"
    ON storage.objects FOR ALL TO authenticated
    USING (bucket_id = 'inventory-bills' AND public.is_admin())
    WITH CHECK (bucket_id = 'inventory-bills' AND public.is_admin());
