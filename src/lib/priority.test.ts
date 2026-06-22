import { describe, it, expect } from 'vitest';
import { compareQueuePriority, sortWaitingPatients } from '@/lib/priority';
import { Patient } from '@/types';

const p = (id: string, priority: string | null, created: string): Patient => ({
  id,
  token_number: 'A001',
  patient_name: 'Test',
  phone: null,
  family_group_id: null,
  clinic_id: 'c1',
  status: 'WAITING',
  created_at: created,
  called_at: null,
  completed_at: null,
  qr_access_code: 'X',
  date_created: '2026-01-01',
  chief_complaint: null,
  ai_priority: priority as Patient['ai_priority'],
  ai_priority_note: null,
});

describe('priority', () => {
  it('sorts EMERGENCY before URGENT before ROUTINE', () => {
    const sorted = sortWaitingPatients([
      p('1', 'ROUTINE', '2026-01-01T09:00:00Z'),
      p('2', 'EMERGENCY', '2026-01-01T10:00:00Z'),
      p('3', 'URGENT', '2026-01-01T11:00:00Z'),
    ]);
    expect(sorted.map((x) => x.id)).toEqual(['2', '3', '1']);
  });

  it('FIFO within same priority', () => {
    expect(compareQueuePriority(
      p('early', 'ROUTINE', '2026-01-01T09:00:00Z'),
      p('late', 'ROUTINE', '2026-01-01T10:00:00Z')
    )).toBeLessThan(0);
  });
});
