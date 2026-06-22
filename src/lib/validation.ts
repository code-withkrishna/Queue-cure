export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

function trimMax(value: string | undefined, max: number, field: string): string | undefined {
  if (value === undefined || value === null) return undefined;
  const trimmed = String(value).trim();
  if (trimmed.length > max) {
    throw new ValidationError(`${field} must be at most ${max} characters`);
  }
  return trimmed || undefined;
}

export function validateAddPatientPayload(body: {
  patient_name?: string;
  phone?: string;
  chief_complaint?: string;
  family_group_id?: string;
}): {
  patient_name: string;
  phone?: string;
  chief_complaint?: string;
  family_group_id?: string;
} {
  const patient_name = trimMax(body.patient_name, 100, 'Patient name');
  if (!patient_name) {
    throw new ValidationError('Patient name is required');
  }

  return {
    patient_name,
    phone:           trimMax(body.phone, 20, 'Phone'),
    chief_complaint: trimMax(body.chief_complaint, 500, 'Chief complaint'),
    family_group_id: body.family_group_id?.trim() || undefined,
  };
}

export function validateGroupName(group_name: string | undefined): string {
  const name = trimMax(group_name, 100, 'Group name');
  if (!name) throw new ValidationError('Group name required');
  return name;
}
