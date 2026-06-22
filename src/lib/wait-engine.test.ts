import { describe, it, expect } from 'vitest';
import {
  calculateAvgConsultationTime,
  calculateEstimatedWait,
  getPeopleAhead,
} from '@/lib/wait-engine';
import { Patient } from '@/types';

const base = (overrides: Partial<Patient>): Patient => ({
  id:               '1',
  token_number:     'A001',
  patient_name:     'Test',
  phone:            null,
  family_group_id:  null,
  clinic_id:        'clinic-1',
  status:           'WAITING',
  created_at:       '2026-01-01T10:00:00Z',
  called_at:        null,
  completed_at:     null,
  qr_access_code:   'ABC123',
  date_created:     '2026-01-01',
  chief_complaint:  null,
  ai_priority:      null,
  ai_priority_note: null,
  ...overrides,
});

describe('wait-engine', () => {
  it('falls back to default avg when no completions', () => {
    expect(calculateAvgConsultationTime([], 8)).toBe(8);
  });

  it('computes average consultation from completed patients', () => {
    const patients = [
      base({
        status: 'COMPLETED',
        called_at: '2026-01-01T10:00:00Z',
        completed_at: '2026-01-01T10:10:00Z',
      }),
      base({
        id: '2',
        status: 'COMPLETED',
        called_at: '2026-01-01T11:00:00Z',
        completed_at: '2026-01-01T11:20:00Z',
      }),
    ];
    expect(calculateAvgConsultationTime(patients)).toBe(15);
  });

  it('counts people ahead using priority then FIFO', () => {
    const patients = [
      base({ id: 'a', ai_priority: 'ROUTINE', created_at: '2026-01-01T09:00:00Z' }),
      base({ id: 'b', ai_priority: 'EMERGENCY', created_at: '2026-01-01T10:00:00Z' }),
      base({ id: 'c', ai_priority: 'URGENT', created_at: '2026-01-01T11:00:00Z' }),
    ];
    expect(getPeopleAhead(patients, 'b')).toBe(0);
    expect(getPeopleAhead(patients, 'c')).toBe(1);
    expect(getPeopleAhead(patients, 'a')).toBe(2);
  });

  it('estimates wait from people ahead and avg consultation', () => {
    expect(calculateEstimatedWait(3, 8)).toBe(24);
  });
});
