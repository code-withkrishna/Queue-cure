import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { requireAuth } from '@/lib/supabase/auth';
import { getClinicId } from '@/lib/clinic-id';
import { getTodayDate } from '@/lib/date';
import { handleRouteError } from '@/lib/api-utils';
import { clientIp, rateLimit } from '@/lib/rate-limit';
import { fetchReceptionSnapshot } from '@/lib/reception-snapshot';

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
    const snapshot = await fetchReceptionSnapshot(supabase, clinicId, today);

    return NextResponse.json(snapshot.stats);
  } catch (err) {
    return handleRouteError(err, '[GET /api/stats]');
  }
}
