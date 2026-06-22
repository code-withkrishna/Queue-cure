import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { requireAuth } from '@/lib/supabase/auth';
import { getClinicId } from '@/lib/clinic-id';
import { getTodayDate } from '@/lib/date';
import { handleRouteError } from '@/lib/api-utils';
import { fetchClinicSettings } from '@/lib/clinic-settings';
import { buildQueueStats } from '@/lib/queue-stats';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    await requireAuth();
    const supabase = createClient();
    const today    = getTodayDate();
    const clinicId = getClinicId();

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

    return NextResponse.json({
      patients: patientsRes.data ?? [],
      stats:    buildQueueStats(settingsData, metricsRes.data ?? []),
    });
  } catch (err) {
    return handleRouteError(err, '[GET /api/reception/snapshot]');
  }
}
