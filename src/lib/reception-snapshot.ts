import type { SupabaseClient } from '@supabase/supabase-js';
import { fetchClinicSettings } from '@/lib/clinic-settings';
import { buildQueueStats } from '@/lib/queue-stats';
import { Patient, QueueStats } from '@/types';

export interface ReceptionSnapshot {
  patients: Patient[];
  stats: QueueStats | null;
}

interface SupabaseErrorLike {
  code?: string;
  message?: string;
}

function isMissingReceptionSnapshotRpc(error: SupabaseErrorLike): boolean {
  const message = error.message?.toLowerCase() ?? '';
  return (
    error.code === 'PGRST202' ||
    error.code === '42883' ||
    (message.includes('get_reception_snapshot') && message.includes('function'))
  );
}

async function fetchReceptionSnapshotFallback(
  supabase: SupabaseClient,
  clinicId: string,
  today: string
): Promise<ReceptionSnapshot> {
  const [patientsRes, settingsData, metricsRes] = await Promise.all([
    supabase
      .from('patients')
      .select('*, family_group:family_groups(*)')
      .eq('date_created', today)
      .eq('clinic_id', clinicId)
      .in('status', ['WAITING', 'CALLED'])
      .order('created_at', { ascending: true }),
    fetchClinicSettings(supabase, clinicId),
    supabase
      .from('patients')
      .select('status, called_at, completed_at')
      .eq('date_created', today)
      .eq('clinic_id', clinicId),
  ]);

  if (patientsRes.error) throw patientsRes.error;
  if (metricsRes.error) throw metricsRes.error;

  return {
    patients: (patientsRes.data ?? []) as Patient[],
    stats: buildQueueStats(settingsData, metricsRes.data ?? []),
  };
}

export async function fetchReceptionSnapshot(
  supabase: SupabaseClient,
  clinicId: string,
  today: string
): Promise<ReceptionSnapshot> {
  const { data, error } = await supabase.rpc('get_reception_snapshot', {
    p_clinic_id: clinicId,
    p_today:     today,
  });

  if (!error) {
    const snapshot = data as Partial<ReceptionSnapshot> | null;
    return {
      patients: snapshot?.patients ?? [],
      stats:    snapshot?.stats ?? null,
    };
  }

  if (!isMissingReceptionSnapshotRpc(error)) {
    throw error;
  }

  return fetchReceptionSnapshotFallback(supabase, clinicId, today);
}
