-- ============================================================
-- Queue Cure — Migration 004: Security, integrity & RPC
-- Run AFTER migrations 001–003
-- ============================================================

-- ── 1. Deployment config (single clinic per deployment) ───────
CREATE TABLE IF NOT EXISTS deployment_config (
  id         int  PRIMARY KEY DEFAULT 1,
  clinic_id  uuid NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  CONSTRAINT deployment_config_singleton CHECK (id = 1)
);

INSERT INTO deployment_config (clinic_id)
SELECT id FROM clinics WHERE slug = 'default'
ON CONFLICT (id) DO NOTHING;

-- ── 2. family_groups multi-tenant ───────────────────────────
ALTER TABLE family_groups
  ADD COLUMN IF NOT EXISTS clinic_id uuid REFERENCES clinics(id) ON DELETE CASCADE;

UPDATE family_groups
SET clinic_id = (SELECT clinic_id FROM deployment_config WHERE id = 1)
WHERE clinic_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_family_groups_clinic_id ON family_groups(clinic_id);

-- ── 3. Token uniqueness per clinic per day ──────────────────
CREATE UNIQUE INDEX IF NOT EXISTS idx_patients_token_unique
  ON patients (clinic_id, date_created, token_number);

-- ── 4. Clinic-scoped RLS (replaces open SELECT) ─────────────
DROP POLICY IF EXISTS "anon_select_patients"   ON patients;
DROP POLICY IF EXISTS "anon_select_settings"   ON clinic_settings;
DROP POLICY IF EXISTS "anon_select_events"     ON queue_events;
DROP POLICY IF EXISTS "anon_select_groups"     ON family_groups;
DROP POLICY IF EXISTS "anon_select_clinics"    ON clinics;

CREATE POLICY "anon_select_patients"
  ON patients FOR SELECT
  USING (clinic_id = (SELECT clinic_id FROM deployment_config WHERE id = 1));

CREATE POLICY "anon_select_settings"
  ON clinic_settings FOR SELECT
  USING (clinic_id = (SELECT clinic_id FROM deployment_config WHERE id = 1));

CREATE POLICY "anon_select_events"
  ON queue_events FOR SELECT
  USING (
    patient_id IN (
      SELECT id FROM patients
      WHERE clinic_id = (SELECT clinic_id FROM deployment_config WHERE id = 1)
    )
  );

CREATE POLICY "anon_select_groups"
  ON family_groups FOR SELECT
  USING (clinic_id = (SELECT clinic_id FROM deployment_config WHERE id = 1));

CREATE POLICY "anon_select_clinics"
  ON clinics FOR SELECT
  USING (id = (SELECT clinic_id FROM deployment_config WHERE id = 1));

ALTER TABLE deployment_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anon_select_deployment_config"
  ON deployment_config FOR SELECT USING (true);

-- ── 5. Atomic call-next (priority FIFO + row lock) ──────────
CREATE OR REPLACE FUNCTION call_next_patient(p_clinic_id uuid, p_today date)
RETURNS patients
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_next_id uuid;
  v_active  record;
  v_result  patients%ROWTYPE;
BEGIN
  PERFORM get_or_create_clinic_settings(p_clinic_id);

  SELECT id, token_number INTO v_active
  FROM patients
  WHERE clinic_id = p_clinic_id
    AND date_created = p_today
    AND status = 'CALLED'
  LIMIT 1
  FOR UPDATE;

  IF FOUND THEN
    RAISE EXCEPTION 'ACTIVE_CALL_EXISTS: Token % is still active', v_active.token_number
      USING ERRCODE = 'P0001';
  END IF;

  SELECT id INTO v_next_id
  FROM patients
  WHERE clinic_id = p_clinic_id
    AND date_created = p_today
    AND status = 'WAITING'
  ORDER BY
    CASE ai_priority
      WHEN 'EMERGENCY' THEN 0
      WHEN 'URGENT'    THEN 1
      WHEN 'ROUTINE'   THEN 2
      ELSE 3
    END,
    created_at ASC
  LIMIT 1
  FOR UPDATE SKIP LOCKED;

  IF v_next_id IS NULL THEN
    RAISE EXCEPTION 'NO_PATIENTS_WAITING'
      USING ERRCODE = 'P0002';
  END IF;

  UPDATE patients
  SET status = 'CALLED', called_at = now()
  WHERE id = v_next_id
  RETURNING * INTO v_result;

  UPDATE clinic_settings
  SET current_token_id = v_next_id
  WHERE clinic_id = p_clinic_id;

  INSERT INTO queue_events (patient_id, event_type)
  VALUES (v_next_id, 'TOKEN_CALLED');

  RETURN v_result;
END;
$$;

-- ── 6. Atomic patient creation (token generation under lock) ─
CREATE OR REPLACE FUNCTION create_patient_record(
  p_clinic_id        uuid,
  p_today            date,
  p_patient_name     varchar,
  p_phone            varchar,
  p_family_group_id  uuid,
  p_qr_access_code   varchar,
  p_chief_complaint  text,
  p_ai_priority      varchar,
  p_ai_priority_note text
)
RETURNS patients
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_last_token varchar(10);
  v_next_token varchar(10);
  v_prefix     char(1);
  v_num        int;
  v_result     patients%ROWTYPE;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtext(p_clinic_id::text || p_today::text));

  SELECT token_number INTO v_last_token
  FROM patients
  WHERE clinic_id = p_clinic_id AND date_created = p_today
  ORDER BY created_at DESC
  LIMIT 1;

  IF v_last_token IS NULL THEN
    v_next_token := 'A001';
  ELSE
    v_prefix := upper(substr(v_last_token, 1, 1));
    v_num    := substr(v_last_token, 2)::int;
    IF v_num >= 999 THEN
      v_next_token := chr(ascii(v_prefix) + 1) || '001';
    ELSE
      v_next_token := v_prefix || lpad((v_num + 1)::text, 3, '0');
    END IF;
  END IF;

  INSERT INTO patients (
    token_number, patient_name, phone, family_group_id, clinic_id,
    status, qr_access_code, date_created, chief_complaint,
    ai_priority, ai_priority_note
  ) VALUES (
    v_next_token, p_patient_name, p_phone, p_family_group_id, p_clinic_id,
    'WAITING', p_qr_access_code, p_today, p_chief_complaint,
    p_ai_priority, p_ai_priority_note
  )
  RETURNING * INTO v_result;

  INSERT INTO queue_events (patient_id, event_type)
  VALUES (v_result.id, 'PATIENT_ADDED');

  RETURN v_result;
END;
$$;

-- ── 7. Wait-room snapshot (position without exposing full queue) ─
CREATE OR REPLACE FUNCTION get_wait_room_snapshot(p_access_code varchar, p_clinic_id uuid, p_today date)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_patient    patients%ROWTYPE;
  v_ahead      int := -1;
  v_pos        int;
  v_settings   clinic_settings%ROWTYPE;
  v_current    patients%ROWTYPE;
  v_token_num  varchar(10);
BEGIN
  SELECT * INTO v_patient
  FROM patients
  WHERE qr_access_code = p_access_code
    AND clinic_id = p_clinic_id
    AND date_created = p_today;

  IF NOT FOUND THEN
    RETURN json_build_object('found', false);
  END IF;

  IF v_patient.status = 'WAITING' THEN
    SELECT pos - 1 INTO v_ahead
    FROM (
      SELECT id,
        row_number() OVER (
          ORDER BY
            CASE ai_priority
              WHEN 'EMERGENCY' THEN 0
              WHEN 'URGENT'    THEN 1
              WHEN 'ROUTINE'   THEN 2
              ELSE 3
            END,
            created_at ASC
        ) AS pos
      FROM patients
      WHERE clinic_id = p_clinic_id
        AND date_created = p_today
        AND status = 'WAITING'
    ) ranked
    WHERE id = v_patient.id;
  END IF;

  PERFORM get_or_create_clinic_settings(p_clinic_id);
  SELECT * INTO v_settings FROM clinic_settings WHERE clinic_id = p_clinic_id;

  v_token_num := NULL;
  IF v_settings.current_token_id IS NOT NULL THEN
    SELECT token_number INTO v_token_num FROM patients WHERE id = v_settings.current_token_id;
  END IF;

  RETURN json_build_object(
    'found', true,
    'patient', row_to_json(v_patient),
    'people_ahead', COALESCE(v_ahead, -1),
    'is_paused', COALESCE(v_settings.queue_paused, false),
    'current_token_number', v_token_num
  );
END;
$$;

-- ── 8. End-of-day archive helper ──────────────────────────────
CREATE OR REPLACE FUNCTION archive_stale_queue_days(p_today date DEFAULT CURRENT_DATE)
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count int;
BEGIN
  UPDATE patients
  SET status = 'CANCELLED'
  WHERE date_created < p_today
    AND status IN ('WAITING', 'CALLED', 'SKIPPED');

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;
