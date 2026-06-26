import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { requireAuth } from '@/lib/supabase/auth';
import { getClinicId } from '@/lib/clinic-id';
import { getTodayDate } from '@/lib/date';
import { handleRouteError } from '@/lib/api-utils';
import { clientIp, rateLimit } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    await requireAuth();

    const ip = clientIp(req);
    const limited = rateLimit(`stats:${ip}`, 120);
    if (!limited.ok) {
      return NextResponse.json(
        { error: 'Too many requests' },
        { status: 429, headers: { 'Retry-After': String(limited.retryAfterSec) } }
      );
    }

    const supabase = createClient();
    const today    = getTodayDate();
    const clinicId = getClinicId();

    // ⚡ Bolt Optimization: Replace multiple Promise.all queries that transfer all patient rows
    // to Node.js with a single PostgreSQL RPC call. This drastically reduces DB round-trips,
    // network serialization latency, and Node memory footprint by performing aggregation directly
    // in the database engine.
    const { data, error } = await supabase.rpc('get_reception_snapshot', {
      p_clinic_id: clinicId,
      p_today:     today,
    });

    if (error) throw error;

    return NextResponse.json(data?.stats ?? {});
  } catch (err) {
    return handleRouteError(err, '[GET /api/stats]');
  }
}
