// ============================================================
// Clinic ID Helper
//
// Centralizes the NEXT_PUBLIC_CLINIC_ID env var access that was
// previously duplicated across 4+ API route files as:
//   const CLINIC_ID = () => process.env.NEXT_PUBLIC_CLINIC_ID!;
//
// Single source of truth — easier to add validation or defaults.
// ============================================================

/**
 * Returns the active clinic UUID from environment config.
 * Used by all API routes to scope queries to the current clinic.
 */
export function getClinicId(): string {
  const id = process.env.NEXT_PUBLIC_CLINIC_ID;
  if (!id) {
    throw new Error(
      'NEXT_PUBLIC_CLINIC_ID is not set. ' +
      'Run migration 001 and copy the clinic UUID into your .env.local file.'
    );
  }
  return id;
}

/** Client-safe clinic id for Realtime filters (empty string if unset). */
export function getPublicClinicId(): string {
  return process.env.NEXT_PUBLIC_CLINIC_ID ?? '';
}
