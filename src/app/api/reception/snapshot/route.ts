import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { requireAuth } from '@/lib/supabase/auth';
import { getClinicId } from '@/lib/clinic-id';
import { getTodayDate } from '@/lib/date';
import { handleRouteError } from '@/lib/api-utils';
import { fetchReceptionSnapshot } from '@/lib/reception-snapshot';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    await requireAuth();
    const supabase = createClient();
    const today    = getTodayDate();
    const clinicId = getClinicId();

    return NextResponse.json(await fetchReceptionSnapshot(supabase, clinicId, today));
  } catch (err) {
    return handleRouteError(err, '[GET /api/reception/snapshot]');
  }
}
