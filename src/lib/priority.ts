import { Patient } from '@/types';

export const PRIORITY_ORDER: Record<string, number> = {
  EMERGENCY: 0,
  URGENT:    1,
  ROUTINE:   2,
};

export function compareQueuePriority(a: Patient, b: Patient): number {
  const aOrd = PRIORITY_ORDER[a.ai_priority ?? ''] ?? 3;
  const bOrd = PRIORITY_ORDER[b.ai_priority ?? ''] ?? 3;
  if (aOrd !== bOrd) return aOrd - bOrd;
  return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
}

export function sortWaitingPatients(patients: Patient[]): Patient[] {
  return [...patients]
    .filter((p) => p.status === 'WAITING')
    .sort(compareQueuePriority);
}
