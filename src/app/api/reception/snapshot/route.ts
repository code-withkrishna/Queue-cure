import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { requireAuth } from '@/lib/supabase/auth';
import { getClinicId } from '@/lib/clinic-id';
import { getTodayDate } from '@/lib/date';
import { handleRouteError } from '@/lib/api-utils';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    await requireAuth();
    const supabase = createClient();
    const today    = getTodayDate();
    const clinicId = getClinicId();

    // ⚡ Bolt Optimization: Use the single-round-trip RPC instead of 3 separate queries
    // This reduces database load, network latency, and Node.js memory overhead
    const { data, error } = await supabase.rpc('get_reception_snapshot', {
      p_clinic_id: clinicId,
      p_today:     today,
    });

    if (error) throw error;

    return NextResponse.json(data);
  } catch (err) {
    return handleRouteError(err, '[GET /api/reception/snapshot]');
  }
}
