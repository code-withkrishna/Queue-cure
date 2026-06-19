-- ============================================================
-- Queue Cure — Migration 003: Multi-Clinic Settings Fix
-- Run AFTER migration 002
--
-- Problem: clinic_settings has a CHECK (id = 1) singleton
-- constraint, making it impossible to store settings for more
-- than one clinic. All API routes also hardcode .eq('id', 1).
--
-- Fix:
--   1. Drop the singleton constraint
--   2. Add UNIQUE on clinic_id (one settings row per clinic)
--   3. Create a helper function to upsert settings rows
-- ============================================================

-- ── 1. Drop the singleton constraint ─────────────────────────
ALTER TABLE clinic_settings
  DROP CONSTRAINT IF EXISTS settings_singleton;

-- ── 2. Add unique constraint on clinic_id ────────────────────
-- Ensures exactly one settings row per clinic.
-- The existing row (id=1, clinic_id=default-clinic-uuid) is preserved.
ALTER TABLE clinic_settings
  ADD CONSTRAINT clinic_settings_clinic_id_unique UNIQUE (clinic_id);

-- ── 3. Helper function: get-or-create settings for a clinic ──
-- API routes can call this via Supabase RPC to ensure a settings
-- row exists before querying. Prevents "no rows" errors when a
-- new clinic is added but hasn't been manually seeded.
CREATE OR REPLACE FUNCTION get_or_create_clinic_settings(p_clinic_id uuid)
RETURNS clinic_settings
LANGUAGE plpgsql
AS $$
DECLARE
  result clinic_settings;
BEGIN
  -- Try to find existing
  SELECT * INTO result
  FROM clinic_settings
  WHERE clinic_id = p_clinic_id;

  -- If not found, create with defaults
  IF NOT FOUND THEN
    INSERT INTO clinic_settings (id, clinic_id, queue_paused, default_consultation_time)
    VALUES (
      (SELECT COALESCE(MAX(id), 0) + 1 FROM clinic_settings),
      p_clinic_id,
      false,
      8
    )
    ON CONFLICT (clinic_id) DO NOTHING
    RETURNING * INTO result;

    -- Handle race condition: if ON CONFLICT hit, re-select
    IF result IS NULL THEN
      SELECT * INTO result
      FROM clinic_settings
      WHERE clinic_id = p_clinic_id;
    END IF;
  END IF;

  RETURN result;
END;
$$;

-- ── 4. Verify ────────────────────────────────────────────────
-- Confirm the constraint was dropped and the new one applied:
SELECT conname, contype
FROM pg_constraint
WHERE conrelid = 'clinic_settings'::regclass
ORDER BY conname;
