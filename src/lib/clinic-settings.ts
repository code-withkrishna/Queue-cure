import type { SupabaseClient } from '@supabase/supabase-js';

type SettingsRow = {
  id?: number;
  clinic_id?: string | null;
  queue_paused?: boolean;
  default_consultation_time?: number;
  current_token_id?: string | null;
  current_token?: {
    token_number: string;
    patient_name: string;
    status: string;
  } | null;
};

const SETTINGS_SELECT =
  '*, current_token:patients(token_number, status, patient_name)';

/**
 * Load clinic settings without relying on DB RPCs.
 * Supports multi-clinic (clinic_id) and legacy singleton (id = 1) schemas.
 */
export async function fetchClinicSettings(
  supabase: SupabaseClient,
  clinicId: string
): Promise<SettingsRow | null> {
  const { data: byClinic } = await supabase
    .from('clinic_settings')
    .select(SETTINGS_SELECT)
    .eq('clinic_id', clinicId)
    .maybeSingle();

  if (byClinic) return byClinic;

  const { data: legacy } = await supabase
    .from('clinic_settings')
    .select(SETTINGS_SELECT)
    .eq('id', 1)
    .maybeSingle();

  return legacy;
}

/** Ensure a settings row exists; returns the row (never throws on missing RPC). */
export async function ensureClinicSettings(
  supabase: SupabaseClient,
  clinicId: string
): Promise<SettingsRow> {
  const existing = await fetchClinicSettings(supabase, clinicId);
  if (existing) return existing;

  const { data: created, error } = await supabase
    .from('clinic_settings')
    .insert({
      clinic_id:                 clinicId,
      queue_paused:              false,
      default_consultation_time: 8,
    })
    .select(SETTINGS_SELECT)
    .single();

  if (!error && created) return created;

  // Race or legacy schema — re-fetch
  const retry = await fetchClinicSettings(supabase, clinicId);
  if (retry) return retry;

  return {
    queue_paused:              false,
    default_consultation_time: 8,
  };
}

/** Build the filter column for updates (clinic_id vs legacy id). */
export function clinicSettingsFilter(
  clinicId: string,
  settings: SettingsRow | null
): { column: 'clinic_id' | 'id'; value: string | number } {
  if (settings?.clinic_id) {
    return { column: 'clinic_id', value: clinicId };
  }
  return { column: 'id', value: settings?.id ?? 1 };
}
