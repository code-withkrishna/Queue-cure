// ============================================================
// Smart Wait-Time Engine
// ============================================================

import { Patient } from '@/types';
import { sortWaitingPatients } from '@/lib/priority';

export function calculateAvgConsultationTime(
  patients: Patient[],
  defaultMinutes = 8
): number {
  const completed = patients.filter(
    (p) => p.status === 'COMPLETED' && p.called_at && p.completed_at
  );

  if (completed.length === 0) return defaultMinutes;

  const totalMinutes = completed.reduce((sum, p) => {
    const calledMs = new Date(p.called_at!).getTime();
    const doneMs = new Date(p.completed_at!).getTime();
    return sum + (doneMs - calledMs) / 60_000;
  }, 0);

  const avg = totalMinutes / completed.length;
  return Math.max(1, Math.round(avg * 10) / 10);
}

export function calculateEstimatedWait(
  peopleAhead: number,
  avgConsultationMin: number
): number {
  return Math.round(peopleAhead * avgConsultationMin);
}

/**
 * WAITING patients ahead of target, using the same priority order as call-next.
 */
export function getPeopleAhead(allPatients: Patient[], targetId: string): number {
  const waiting = sortWaitingPatients(allPatients);
  const index = waiting.findIndex((p) => p.id === targetId);
  return index;
}

export function getLongestConsultation(patients: Patient[]): number {
  const completed = patients.filter(
    (p) => p.status === 'COMPLETED' && p.called_at && p.completed_at
  );

  if (completed.length === 0) return 0;

  return Math.round(
    Math.max(
      ...completed.map((p) => {
        const calledMs = new Date(p.called_at!).getTime();
        const doneMs = new Date(p.completed_at!).getTime();
        return (doneMs - calledMs) / 60_000;
      })
    )
  );
}
