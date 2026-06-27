import type { SupabaseClient } from '@supabase/supabase-js';
import { fetchClinicSettings } from '@/lib/clinic-settings';
import {
  calculateAvgConsultationTime,
  calculateEstimatedWait,
  getPeopleAhead,
} from '@/lib/wait-engine';
import { Patient } from '@/types';

export interface WaitRoomSnapshot {
  found: boolean;
  patient?: Patient;
  peopleAhead: number;
  estimatedWait: number;
  isPaused: boolean;
  currentTokenNumber: string | null;
  avgConsultationMinutes: number;
}

interface RpcWaitRoomSnapshot {
  found: boolean;
  patient?: Patient;
  people_ahead?: number;
  is_paused?: boolean;
  current_token_number?: string | null;
  avg_consultation_minutes?: number;
}

interface SupabaseErrorLike {
  code?: string;
  message?: string;
}

function shouldFallbackFromWaitRoomRpc(error: SupabaseErrorLike): boolean {
  const message = error.message?.toLowerCase() ?? '';
  return (
    error.code === 'PGRST202' ||
    error.code === '42883' ||
    message.includes('get_wait_room_snapshot') ||
    message.includes('get_or_create_clinic_settings')
  );
}

async function fetchWaitRoomSnapshotFallback(
  supabase: SupabaseClient,
  accessCode: string,
  clinicId: string,
  today: string
): Promise<WaitRoomSnapshot> {
  const { data: patient, error: patientError } = await supabase
    .from('patients')
    .select('*')
    .eq('qr_access_code', accessCode)
    .eq('clinic_id', clinicId)
    .eq('date_created', today)
    .maybeSingle();

  if (patientError) throw patientError;

  if (!patient) {
    return {
      found: false,
      peopleAhead: -1,
      estimatedWait: 0,
      isPaused: false,
      currentTokenNumber: null,
      avgConsultationMinutes: 8,
    };
  }

  const [settingsData, waitingRes, completedRes] = await Promise.all([
    fetchClinicSettings(supabase, clinicId),
    patient.status === 'WAITING'
      ? supabase
          .from('patients')
          .select('id, status, ai_priority, created_at')
          .eq('clinic_id', clinicId)
          .eq('date_created', today)
          .eq('status', 'WAITING')
      : Promise.resolve({ data: [], error: null }),
    supabase
      .from('patients')
      .select('status, called_at, completed_at')
      .eq('clinic_id', clinicId)
      .eq('date_created', today)
      .eq('status', 'COMPLETED')
      .not('called_at', 'is', null)
      .not('completed_at', 'is', null),
  ]);

  if (waitingRes.error) throw waitingRes.error;
  if (completedRes.error) throw completedRes.error;

  const avgConsultationMinutes = calculateAvgConsultationTime(
    completedRes.data as Patient[],
    settingsData?.default_consultation_time ?? 8
  );
  const peopleAhead =
    patient.status === 'WAITING'
      ? getPeopleAhead(waitingRes.data as Patient[], patient.id)
      : -1;

  return {
    found: true,
    patient: patient as Patient,
    peopleAhead,
    estimatedWait:
      peopleAhead >= 0 ? calculateEstimatedWait(peopleAhead, avgConsultationMinutes) : 0,
    isPaused: settingsData?.queue_paused ?? false,
    currentTokenNumber: settingsData?.current_token?.token_number ?? null,
    avgConsultationMinutes,
  };
}

export async function fetchWaitRoomSnapshot(
  supabase: SupabaseClient,
  accessCode: string,
  clinicId: string,
  today: string
): Promise<WaitRoomSnapshot> {
  const { data, error } = await supabase.rpc('get_wait_room_snapshot', {
    p_access_code: accessCode,
    p_clinic_id:   clinicId,
    p_today:       today,
  });

  if (!error) {
    const snap = data as RpcWaitRoomSnapshot;
    if (!snap?.found) {
      return {
        found: false,
        peopleAhead: -1,
        estimatedWait: 0,
        isPaused: false,
        currentTokenNumber: null,
        avgConsultationMinutes: 8,
      };
    }

    const avgConsultationMinutes = snap.avg_consultation_minutes ?? 8;
    const peopleAhead = snap.people_ahead ?? -1;

    return {
      found: true,
      patient: snap.patient,
      peopleAhead,
      estimatedWait:
        peopleAhead >= 0 ? calculateEstimatedWait(peopleAhead, avgConsultationMinutes) : 0,
      isPaused: snap.is_paused ?? false,
      currentTokenNumber: snap.current_token_number ?? null,
      avgConsultationMinutes,
    };
  }

  if (!shouldFallbackFromWaitRoomRpc(error)) {
    throw error;
  }

  return fetchWaitRoomSnapshotFallback(supabase, accessCode, clinicId, today);
}
