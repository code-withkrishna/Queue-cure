// ============================================================
// Smart Wait-Time Engine
// Never hardcoded — uses real consultation durations
// ============================================================

import { Patient } from '@/types';

/**
 * Compute average consultation time from today's completed patients.
 * Falls back to defaultMinutes if no completions yet.
 */
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
  return Math.max(1, Math.round(avg * 10) / 10); // min 1 min, 1 decimal
}

/**
 * Estimated wait = people ahead × average consultation time
 */
export function calculateEstimatedWait(
  peopleAhead: number,
  avgConsultationMin: number
): number {
  return Math.round(peopleAhead * avgConsultationMin);
}

/**
 * How many WAITING patients are ahead of the target patient (FIFO).
 * Returns -1 if patient not found or not WAITING.
 */
export function getPeopleAhead(allPatients: Patient[], targetId: string): number {
  const waiting = [...allPatients]
    .filter((p) => p.status === 'WAITING')
    .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

  const index = waiting.findIndex((p) => p.id === targetId);
  return index; // 0 = next up (no one ahead), -1 = not in queue
}

/**
 * Longest single consultation in minutes from today.
 */
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
