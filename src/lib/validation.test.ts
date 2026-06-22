import { describe, it, expect } from 'vitest';
import { validateAddPatientPayload, validateGroupName } from '@/lib/validation';

describe('validation', () => {
  it('requires patient name', () => {
    expect(() => validateAddPatientPayload({})).toThrow('Patient name is required');
  });

  it('trims and accepts valid payload', () => {
    const result = validateAddPatientPayload({
      patient_name: '  Ramesh  ',
      phone: '9876543210',
      chief_complaint: 'fever',
    });
    expect(result.patient_name).toBe('Ramesh');
    expect(result.phone).toBe('9876543210');
  });

  it('rejects overly long names', () => {
    expect(() =>
      validateAddPatientPayload({ patient_name: 'x'.repeat(101) })
    ).toThrow('at most 100');
  });

  it('validates group name', () => {
    expect(validateGroupName('  Family A ')).toBe('Family A');
    expect(() => validateGroupName('')).toThrow('Group name required');
  });
});
