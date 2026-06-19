// ============================================================
// Queue Cure — Core Types  (v2 — includes AI triage + clinic)
// ============================================================

export type PatientStatus   = 'WAITING' | 'CALLED' | 'COMPLETED' | 'SKIPPED' | 'CANCELLED';
export type TriagePriority  = 'ROUTINE' | 'URGENT' | 'EMERGENCY';
export type QueueEventType  =
  | 'PATIENT_ADDED' | 'TOKEN_CALLED' | 'COMPLETED'
  | 'SKIPPED' | 'REJOINED' | 'CANCELLED';
export type PatientAction   = 'call' | 'complete' | 'skip' | 'cancel';

// ── Entities ────────────────────────────────────────────────

export interface Clinic {
  id:         string;
  name:       string;
  slug:       string;
  created_at: string;
}

export interface FamilyGroup {
  id:         string;
  group_name: string;
  created_at: string;
}

export interface Patient {
  id:               string;
  token_number:     string;
  patient_name:     string;
  phone:            string | null;
  family_group_id:  string | null;
  family_group?:    FamilyGroup | null;
  clinic_id:        string | null;
  status:           PatientStatus;
  created_at:       string;
  called_at:        string | null;
  completed_at:     string | null;
  qr_access_code:   string;
  date_created:     string;
  // AI Triage
  chief_complaint:  string | null;
  ai_priority:      TriagePriority | null;
  ai_priority_note: string | null;
}

export interface ClinicSettings {
  id:                        number;
  clinic_id:                 string | null;
  current_token_id:          string | null;
  current_token?:            Patient | null;
  queue_paused:              boolean;
  default_consultation_time: number;
}

export interface QueueEvent {
  id:         string;
  patient_id: string;
  event_type: QueueEventType;
  created_at: string;
}

// ── Payloads ─────────────────────────────────────────────────

export interface QueueStats {
  waitingCount:               number;
  currentToken:               Patient | null;
  avgConsultationMinutes:     number;
  isPaused:                   boolean;
  patientsServedToday:        number;
  longestConsultationMinutes: number;
}

export interface AddPatientPayload {
  patient_name:     string;
  phone?:           string;
  family_group_id?: string;
  chief_complaint?: string;
}
