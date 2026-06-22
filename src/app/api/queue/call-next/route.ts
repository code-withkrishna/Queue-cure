import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { requireAuth } from '@/lib/supabase/auth';
import { getClinicId } from '@/lib/clinic-id';
import { getTodayDate } from '@/lib/date';
import { handleRouteError, rpcErrorResponse } from '@/lib/api-utils';

export async function POST() {
  try {
    await requireAuth();
    const supabase = createClient();
    const today    = getTodayDate();
    const clinicId = getClinicId();

    const { data: called, error: callErr } = await supabase.rpc('call_next_patient', {
      p_clinic_id: clinicId,
      p_today:     today,
    });

    if (callErr) {
      return rpcErrorResponse(callErr.code, callErr.message, 'Failed to call next patient');
    }

    return NextResponse.json({ patient: called });
  } catch (err) {
    return handleRouteError(err, '[POST /api/queue/call-next]');
  }
}
