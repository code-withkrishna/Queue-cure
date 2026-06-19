-- ============================================================
-- Queue Cure — Migration 002: RLS Hardening
-- Run AFTER migration 001
--
-- Architecture after this migration:
--   anon key  (browser / patient screen) → SELECT only
--   service role key (API routes)        → bypasses RLS, full access
--
-- This closes the "any anon can DELETE patients" red flag.
-- ============================================================

-- ── Drop the previous open-everything policies ───────────────
DROP POLICY IF EXISTS "anon_all_patients"   ON patients;
DROP POLICY IF EXISTS "anon_all_settings"   ON clinic_settings;
DROP POLICY IF EXISTS "anon_all_events"     ON queue_events;
DROP POLICY IF EXISTS "anon_all_groups"     ON family_groups;
DROP POLICY IF EXISTS "anon_all_clinics"    ON clinics;

-- Drop any previous partial policies from earlier iterations
DROP POLICY IF EXISTS "anon_select_patients"  ON patients;
DROP POLICY IF EXISTS "anon_select_settings"  ON clinic_settings;
DROP POLICY IF EXISTS "anon_select_events"    ON queue_events;
DROP POLICY IF EXISTS "anon_select_groups"    ON family_groups;
DROP POLICY IF EXISTS "anon_select_clinics"   ON clinics;
DROP POLICY IF EXISTS "anon_read_patients"    ON patients;
DROP POLICY IF EXISTS "anon_read_settings"    ON clinic_settings;
DROP POLICY IF EXISTS "anon_read_events"      ON queue_events;
DROP POLICY IF EXISTS "anon_read_groups"      ON family_groups;
DROP POLICY IF EXISTS "anon_read_clinics"     ON clinics;

-- ── New policies: anon can SELECT only ───────────────────────
-- Required for:
--   patients        → patient waiting room reads position + status
--   clinic_settings → patient screen reads pause state + current token
--   family_groups   → reception form dropdown
--   queue_events    → analytics (read-only)
--   clinics         → clinic name display

CREATE POLICY "anon_select_patients"
  ON patients FOR SELECT USING (true);

CREATE POLICY "anon_select_settings"
  ON clinic_settings FOR SELECT USING (true);

CREATE POLICY "anon_select_events"
  ON queue_events FOR SELECT USING (true);

CREATE POLICY "anon_select_groups"
  ON family_groups FOR SELECT USING (true);

CREATE POLICY "anon_select_clinics"
  ON clinics FOR SELECT USING (true);

-- ── No INSERT / UPDATE / DELETE for anon ─────────────────────
-- All mutations come through Next.js API routes which use the
-- SUPABASE_SERVICE_ROLE_KEY → service role bypasses RLS completely.
-- So no explicit INSERT/UPDATE/DELETE policies are needed for anon.

-- ── Verify ───────────────────────────────────────────────────
-- Run this to confirm policies are correct:
SELECT schemaname, tablename, policyname, cmd, qual
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
