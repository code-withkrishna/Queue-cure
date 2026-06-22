import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { requireAuth } from '@/lib/supabase/auth';
import { getClinicId } from '@/lib/clinic-id';
import { handleRouteError } from '@/lib/api-utils';
import { clinicSettingsFilter, fetchClinicSettings } from '@/lib/clinic-settings';

export async function POST() {
  try {
    await requireAuth();
    const supabase = createClient();
    const clinicId = getClinicId();

    const settings = await fetchClinicSettings(supabase, clinicId);
    if (!settings) {
      return NextResponse.json({ error: 'Clinic settings not found' }, { status: 404 });
    }

    const filter = clinicSettingsFilter(clinicId, settings);
    const newPaused = !settings.queue_paused;

    const { data: updated, error: updateErr } = await supabase
      .from('clinic_settings')
      .update({ queue_paused: newPaused })
      .eq(filter.column, filter.value)
      .select()
      .single();

    if (updateErr) throw updateErr;

    return NextResponse.json({ queue_paused: updated.queue_paused });
  } catch (err) {
    return handleRouteError(err, '[POST /api/queue/toggle-pause]');
  }
}
