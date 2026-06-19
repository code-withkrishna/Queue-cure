-- ============================================================
-- Queue Cure — Migration 001
-- Adds: multi-clinic architecture + AI triage columns
-- Run in: Supabase Dashboard → SQL Editor → New Query
-- (Run AFTER the base schema.sql)
-- ============================================================

-- ── 1. Clinics table (multi-tenant foundation) ───────────────
CREATE TABLE IF NOT EXISTS clinics (
  id         uuid         PRIMARY KEY DEFAULT uuid_generate_v4(),
  name       varchar(100) NOT NULL,
  slug       varchar(50)  UNIQUE NOT NULL,
  created_at timestamptz  NOT NULL DEFAULT now()
);

-- Seed a default clinic for the existing single-clinic deployment
INSERT INTO clinics (name, slug)
VALUES ('Default Clinic', 'default')
ON CONFLICT (slug) DO NOTHING;

-- ── 2. Add clinic_id to patients ────────────────────────────
ALTER TABLE patients
  ADD COLUMN IF NOT EXISTS clinic_id uuid REFERENCES clinics(id) ON DELETE CASCADE;

-- Backfill existing rows
UPDATE patients
SET clinic_id = (SELECT id FROM clinics WHERE slug = 'default')
WHERE clinic_id IS NULL;

-- ── 3. Add clinic_id to clinic_settings ─────────────────────
ALTER TABLE clinic_settings
  ADD COLUMN IF NOT EXISTS clinic_id uuid REFERENCES clinics(id) ON DELETE CASCADE;

UPDATE clinic_settings
SET clinic_id = (SELECT id FROM clinics WHERE slug = 'default')
WHERE id = 1;

-- ── 4. AI Triage columns on patients ────────────────────────
ALTER TABLE patients
  ADD COLUMN IF NOT EXISTS chief_complaint   text,
  ADD COLUMN IF NOT EXISTS ai_priority       varchar(10)
    CONSTRAINT patients_ai_priority_check
    CHECK (ai_priority IN ('ROUTINE', 'URGENT', 'EMERGENCY')),
  ADD COLUMN IF NOT EXISTS ai_priority_note  text;

-- ── 5. Indexes ───────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_patients_clinic_id   ON patients(clinic_id);
CREATE INDEX IF NOT EXISTS idx_patients_ai_priority ON patients(ai_priority);
CREATE INDEX IF NOT EXISTS idx_settings_clinic_id   ON clinic_settings(clinic_id);

-- ── 6. RLS on new table ──────────────────────────────────────
ALTER TABLE clinics ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anon_all_clinics" ON clinics FOR ALL USING (true) WITH CHECK (true);

-- ── 7. Verify — should return the default clinic UUID ───────
SELECT id AS clinic_id, name, slug FROM clinics WHERE slug = 'default';
-- Copy this UUID → paste as CLINIC_ID in your .env.local
