import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getClinicId } from '@/lib/clinic-id';
import { getTodayDate } from '@/lib/date';
import { handleRouteError } from '@/lib/api-utils';
import { clientIp, rateLimit } from '@/lib/rate-limit';
import { calculateEstimatedWait } from '@/lib/wait-engine';
import { Patient } from '@/types';

export const dynamic = 'force-dynamic';

interface WaitRoomSnapshot {
  found: boolean;
  patient?: Patient;
  people_ahead?: number;
  is_paused?: boolean;
  current_token_number?: string | null;
  avg_consultation_minutes?: number;
}

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
    const limited = rateLimit(`wait-room:${ip}`, 60);
    if (!limited.ok) {
      return NextResponse.json(
        { error: 'Too many requests' },
        { status: 429, headers: { 'Retry-After': String(limited.retryAfterSec) } }
      );
    }

    const supabase = createClient();
    const today    = getTodayDate();
    const clinicId = getClinicId();

    const { data: snapshot, error } = await supabase.rpc('get_wait_room_snapshot', {
      p_access_code: code,
      p_clinic_id:   clinicId,
      p_today:       today,
    });

    if (error) throw error;

    const snap = snapshot as WaitRoomSnapshot;
    if (!snap?.found) {
      return NextResponse.json({ found: false }, { status: 404 });
    }

    const avgConsult = snap.avg_consultation_minutes ?? 8;
    const peopleAhead   = snap.people_ahead ?? -1;
    const estimatedWait = peopleAhead >= 0
      ? calculateEstimatedWait(peopleAhead, avgConsult)
      : 0;

    return NextResponse.json({
      found: true,
      patient: snap.patient,
      peopleAhead,
      estimatedWait,
      isPaused: snap.is_paused ?? false,
      currentTokenNumber: snap.current_token_number ?? null,
      avgConsultationMinutes: avgConsult,
    });
  } catch (err) {
    return handleRouteError(err, '[GET /api/wait-room/[code]]');
  }
}
