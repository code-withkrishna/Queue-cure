-- ============================================================
-- Migration 005 — Performance & API consolidation
-- ============================================================

-- ── 1. Composite index for hot queue queries ─────────────────
CREATE INDEX IF NOT EXISTS idx_patients_clinic_date_status_created
  ON patients (clinic_id, date_created, status, created_at);

-- ── 2. Access-code generator (inside DB, collision-safe) ─────
CREATE OR REPLACE FUNCTION generate_qr_access_code()
RETURNS varchar
LANGUAGE plpgsql
AS $$
DECLARE
  v_chars   text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  v_code    varchar(10);
  v_attempt int;
  v_pos     int;
  v_exists  boolean;
BEGIN
  FOR v_attempt IN 1..12 LOOP
    v_code := '';
    FOR v_pos IN 1..6 LOOP
      v_code := v_code || substr(v_chars, 1 + floor(random() * length(v_chars))::int, 1);
    END LOOP;
    SELECT EXISTS(SELECT 1 FROM patients WHERE qr_access_code = v_code) INTO v_exists;
    IF NOT v_exists THEN
      RETURN v_code;
    END IF;
  END LOOP;
  RAISE EXCEPTION 'ACCESS_CODE_COLLISION' USING ERRCODE = 'P0003';
END;
$$;

-- ── 3. Patient creation — generate access code in RPC ────────
CREATE OR REPLACE FUNCTION create_patient_record(
  p_clinic_id        uuid,
  p_today            date,
  p_patient_name     varchar,
  p_phone            varchar,
  p_family_group_id  uuid,
  p_qr_access_code   varchar DEFAULT NULL,
  p_chief_complaint  text DEFAULT NULL,
  p_ai_priority      varchar DEFAULT NULL,
  p_ai_priority_note text DEFAULT NULL
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
  v_access     varchar(10);
  v_result     patients%ROWTYPE;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtext(p_clinic_id::text || p_today::text));

  v_access := COALESCE(NULLIF(trim(p_qr_access_code), ''), generate_qr_access_code());

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
    'WAITING', v_access, p_today, p_chief_complaint,
    p_ai_priority, p_ai_priority_note
  )
  RETURNING * INTO v_result;

  INSERT INTO queue_events (patient_id, event_type)
  VALUES (v_result.id, 'PATIENT_ADDED');

  RETURN v_result;
END;
$$;

-- ── 4. Wait-room snapshot + avg consultation in one call ───────
CREATE OR REPLACE FUNCTION get_wait_room_snapshot(p_access_code varchar, p_clinic_id uuid, p_today date)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_patient    patients%ROWTYPE;
  v_ahead      int := -1;
  v_settings   clinic_settings%ROWTYPE;
  v_token_num  varchar(10);
  v_avg_min    numeric;
  v_default    int := 8;
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
  v_default := COALESCE(v_settings.default_consultation_time, 8);

  SELECT COALESCE(
    NULLIF(
      ROUND(
        AVG(EXTRACT(EPOCH FROM (completed_at - called_at)) / 60.0)::numeric,
        1
      ),
      0
    ),
    v_default
  ) INTO v_avg_min
  FROM patients
  WHERE clinic_id = p_clinic_id
    AND date_created = p_today
    AND status = 'COMPLETED'
    AND called_at IS NOT NULL
    AND completed_at IS NOT NULL;

  IF v_avg_min IS NULL OR v_avg_min < 1 THEN
    v_avg_min := v_default;
  END IF;

  v_token_num := NULL;
  IF v_settings.current_token_id IS NOT NULL THEN
    SELECT token_number INTO v_token_num FROM patients WHERE id = v_settings.current_token_id;
  END IF;

  RETURN json_build_object(
    'found', true,
    'patient', row_to_json(v_patient),
    'people_ahead', COALESCE(v_ahead, -1),
    'is_paused', COALESCE(v_settings.queue_paused, false),
    'current_token_number', v_token_num,
    'avg_consultation_minutes', GREATEST(1, v_avg_min)
  );
END;
$$;

-- ── 5. Atomic patient action (replaces multi-round-trip PATCH) ─
CREATE OR REPLACE FUNCTION handle_patient_action(
  p_clinic_id uuid,
  p_patient_id uuid,
  p_action varchar
)
RETURNS patients
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_patient   patients%ROWTYPE;
  v_active    record;
  v_now       timestamptz := now();
BEGIN
  SELECT * INTO v_patient
  FROM patients
  WHERE id = p_patient_id AND clinic_id = p_clinic_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'PATIENT_NOT_FOUND' USING ERRCODE = 'P0004';
  END IF;

  IF p_action = 'call' AND v_patient.status <> 'WAITING' THEN
    RAISE EXCEPTION 'INVALID_STATUS: Patient must be WAITING to call' USING ERRCODE = 'P0005';
  END IF;
  IF p_action = 'complete' AND v_patient.status <> 'CALLED' THEN
    RAISE EXCEPTION 'INVALID_STATUS: Patient must be CALLED to complete' USING ERRCODE = 'P0005';
  END IF;
  IF p_action = 'skip' AND v_patient.status <> 'CALLED' THEN
    RAISE EXCEPTION 'INVALID_STATUS: Patient must be CALLED to skip' USING ERRCODE = 'P0005';
  END IF;

  IF p_action = 'call' THEN
    SELECT id, token_number INTO v_active
    FROM patients
    WHERE clinic_id = p_clinic_id
      AND date_created = v_patient.date_created
      AND status = 'CALLED'
    LIMIT 1
    FOR UPDATE;

    IF FOUND THEN
      RAISE EXCEPTION 'ACTIVE_CALL_EXISTS: Token % is still active', v_active.token_number
        USING ERRCODE = 'P0001';
    END IF;

    UPDATE patients
    SET status = 'CALLED', called_at = v_now
    WHERE id = p_patient_id
    RETURNING * INTO v_patient;

    UPDATE clinic_settings SET current_token_id = p_patient_id WHERE clinic_id = p_clinic_id;
    INSERT INTO queue_events (patient_id, event_type) VALUES (p_patient_id, 'TOKEN_CALLED');

  ELSIF p_action = 'complete' THEN
    UPDATE patients
    SET status = 'COMPLETED', completed_at = v_now
    WHERE id = p_patient_id
    RETURNING * INTO v_patient;

    UPDATE clinic_settings
    SET current_token_id = NULL
    WHERE clinic_id = p_clinic_id AND current_token_id = p_patient_id;

    INSERT INTO queue_events (patient_id, event_type) VALUES (p_patient_id, 'COMPLETED');

  ELSIF p_action = 'cancel' THEN
    UPDATE patients SET status = 'CANCELLED' WHERE id = p_patient_id RETURNING * INTO v_patient;

    UPDATE clinic_settings
    SET current_token_id = NULL
    WHERE clinic_id = p_clinic_id AND current_token_id = p_patient_id;

    INSERT INTO queue_events (patient_id, event_type) VALUES (p_patient_id, 'CANCELLED');

  ELSIF p_action = 'skip' THEN
    UPDATE patients
    SET status = 'SKIPPED', called_at = NULL
    WHERE id = p_patient_id
    RETURNING * INTO v_patient;

    UPDATE clinic_settings
    SET current_token_id = NULL
    WHERE clinic_id = p_clinic_id AND current_token_id = p_patient_id;

    INSERT INTO queue_events (patient_id, event_type) VALUES (p_patient_id, 'SKIPPED');

    UPDATE patients
    SET status = 'WAITING', created_at = v_now
    WHERE id = p_patient_id
    RETURNING * INTO v_patient;

    INSERT INTO queue_events (patient_id, event_type) VALUES (p_patient_id, 'REJOINED');
  ELSE
    RAISE EXCEPTION 'INVALID_ACTION' USING ERRCODE = 'P0006';
  END IF;

  RETURN v_patient;
END;
$$;

-- ── 6. Reception dashboard snapshot (single round-trip) ──────
CREATE OR REPLACE FUNCTION get_reception_snapshot(p_clinic_id uuid, p_today date)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_settings   clinic_settings%ROWTYPE;
  v_current    json;
  v_waiting    int;
  v_completed  int;
  v_avg_min    numeric;
  v_longest    numeric;
  v_default    int := 8;
BEGIN
  PERFORM get_or_create_clinic_settings(p_clinic_id);
  SELECT * INTO v_settings FROM clinic_settings WHERE clinic_id = p_clinic_id;
  v_default := COALESCE(v_settings.default_consultation_time, 8);

  SELECT COUNT(*) INTO v_waiting
  FROM patients
  WHERE clinic_id = p_clinic_id AND date_created = p_today AND status = 'WAITING';

  SELECT COUNT(*) INTO v_completed
  FROM patients
  WHERE clinic_id = p_clinic_id AND date_created = p_today AND status = 'COMPLETED';

  SELECT COALESCE(
    NULLIF(ROUND(AVG(EXTRACT(EPOCH FROM (completed_at - called_at)) / 60.0)::numeric, 1), 0),
    v_default
  ) INTO v_avg_min
  FROM patients
  WHERE clinic_id = p_clinic_id
    AND date_created = p_today
    AND status = 'COMPLETED'
    AND called_at IS NOT NULL
    AND completed_at IS NOT NULL;

  SELECT COALESCE(MAX(ROUND(EXTRACT(EPOCH FROM (completed_at - called_at)) / 60.0)), 0)
  INTO v_longest
  FROM patients
  WHERE clinic_id = p_clinic_id
    AND date_created = p_today
    AND status = 'COMPLETED'
    AND called_at IS NOT NULL
    AND completed_at IS NOT NULL;

  v_current := NULL;
  IF v_settings.current_token_id IS NOT NULL THEN
    SELECT json_build_object(
      'token_number', p.token_number,
      'patient_name', p.patient_name,
      'status', p.status
    ) INTO v_current
    FROM patients p
    WHERE p.id = v_settings.current_token_id;
  END IF;

  RETURN json_build_object(
    'patients', COALESCE((
      SELECT json_agg(q.patient_json ORDER BY q.created_at ASC)
      FROM (
        SELECT
          pat.created_at,
          json_build_object(
            'id', pat.id,
            'token_number', pat.token_number,
            'patient_name', pat.patient_name,
            'phone', pat.phone,
            'family_group_id', pat.family_group_id,
            'family_group', (SELECT row_to_json(fg.*) FROM family_groups fg WHERE fg.id = pat.family_group_id),
            'clinic_id', pat.clinic_id,
            'status', pat.status,
            'created_at', pat.created_at,
            'called_at', pat.called_at,
            'completed_at', pat.completed_at,
            'qr_access_code', pat.qr_access_code,
            'date_created', pat.date_created,
            'chief_complaint', pat.chief_complaint,
            'ai_priority', pat.ai_priority,
            'ai_priority_note', pat.ai_priority_note
          ) AS patient_json
        FROM patients pat
        WHERE pat.clinic_id = p_clinic_id
          AND pat.date_created = p_today
          AND pat.status IN ('WAITING', 'CALLED')
      ) q
    ), '[]'::json),
    'stats', json_build_object(
      'waitingCount', v_waiting,
      'currentToken', v_current,
      'avgConsultationMinutes', GREATEST(1, COALESCE(v_avg_min, v_default)),
      'isPaused', COALESCE(v_settings.queue_paused, false),
      'patientsServedToday', v_completed,
      'longestConsultationMinutes', COALESCE(v_longest, 0)
    )
  );
END;
$$;
