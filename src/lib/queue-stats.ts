import { Patient, QueueStats } from '@/types';
import { calculateAvgConsultationTime, getLongestConsultation } from '@/lib/wait-engine';

interface SettingsRow {
  queue_paused?: boolean;
  default_consultation_time?: number;
  current_token?: {
    token_number: string;
    patient_name: string;
    status: string;
  } | null;
}

interface PatientMetricRow {
  status: string;
  called_at: string | null;
  completed_at: string | null;
}

/** Build queue stats from settings + today's patient rows (shared by /api/stats). */
export function buildQueueStats(
  settingsData: SettingsRow | null,
  allPatients: PatientMetricRow[]
): QueueStats {
  const waitingCount   = allPatients.filter((p) => p.status === 'WAITING').length;
  const completedToday = allPatients.filter((p) => p.status === 'COMPLETED');
  const avgConsultation = calculateAvgConsultationTime(
    completedToday as Patient[],
    settingsData?.default_consultation_time ?? 8
  );
  const longestConsultation = getLongestConsultation(completedToday as Patient[]);

  const currentToken: Patient | null = settingsData?.current_token
    ? ({
        token_number: settingsData.current_token.token_number,
        patient_name: settingsData.current_token.patient_name,
        status:       settingsData.current_token.status,
      } as Patient)
    : null;

  return {
    waitingCount,
    currentToken,
    avgConsultationMinutes:     avgConsultation,
    isPaused:                   settingsData?.queue_paused ?? false,
    patientsServedToday:        completedToday.length,
    longestConsultationMinutes: longestConsultation,
  };
}
