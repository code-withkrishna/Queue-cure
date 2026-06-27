import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getClinicId } from '@/lib/clinic-id';
import { getTodayDate } from '@/lib/date';
import { handleRouteError } from '@/lib/api-utils';
import { clientIp, rateLimit } from '@/lib/rate-limit';
import { fetchWaitRoomSnapshot } from '@/lib/wait-room-snapshot';

export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const { code: rawCode } = await params;
    const code = rawCode?.trim();
    if (!code || code.length > 20) {
      return NextResponse.json({ error: 'Invalid access code' }, { status: 400 });
    }

    const ip = clientIp(req);
    const limited = rateLimit(`wait-room:${ip}:${code.toUpperCase()}`, 60);
    if (!limited.ok) {
      return NextResponse.json(
        { error: 'Too many requests' },
        { status: 429, headers: { 'Retry-After': String(limited.retryAfterSec) } }
      );
    }

    const supabase = createClient();
    const today    = getTodayDate();
    const clinicId = getClinicId();

    const snapshot = await fetchWaitRoomSnapshot(supabase, code, clinicId, today);

    if (!snapshot.found) {
      return NextResponse.json({ found: false }, { status: 404 });
    }

    return NextResponse.json({
      found: true,
      patient: snapshot.patient,
      peopleAhead: snapshot.peopleAhead,
      estimatedWait: snapshot.estimatedWait,
      isPaused: snapshot.isPaused,
      currentTokenNumber: snapshot.currentTokenNumber,
      avgConsultationMinutes: snapshot.avgConsultationMinutes,
    });
  } catch (err) {
    return handleRouteError(err, '[GET /api/wait-room/[code]]');
  }
}
