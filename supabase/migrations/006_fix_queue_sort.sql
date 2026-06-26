-- Fix sorting of patients in get_reception_snapshot to match UI queue logic
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
      SELECT json_agg(q.patient_json ORDER BY q.status_pos ASC, q.pos ASC, q.created_at ASC)
      FROM (
        SELECT
          pat.created_at,
          CASE pat.status
            WHEN 'CALLED' THEN 0
            ELSE 1
          END AS status_pos,
          CASE pat.ai_priority
            WHEN 'EMERGENCY' THEN 0
            WHEN 'URGENT'    THEN 1
            WHEN 'ROUTINE'   THEN 2
            ELSE 3
          END AS pos,
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
