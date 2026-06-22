import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { requireAuth } from '@/lib/supabase/auth';
import { getClinicId } from '@/lib/clinic-id';
import { handleRouteError, rpcErrorResponse } from '@/lib/api-utils';
import { PatientAction } from '@/types';

const VALID_ACTIONS: PatientAction[] = ['call', 'complete', 'skip', 'cancel'];

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAuth();
    const { action }: { action: PatientAction } = await req.json();
    const { id } = await params;
    const clinicId = getClinicId();

    if (!action || !VALID_ACTIONS.includes(action)) {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    const supabase = createClient();

    const { data: patient, error: rpcErr } = await supabase.rpc('handle_patient_action', {
      p_clinic_id:  clinicId,
      p_patient_id: id,
      p_action:     action,
    });

    if (rpcErr) {
      if (rpcErr.code === 'P0004' || rpcErr.message?.includes('PATIENT_NOT_FOUND')) {
        return NextResponse.json({ error: 'Patient not found' }, { status: 404 });
      }
      if (rpcErr.code === 'P0005' || rpcErr.message?.includes('INVALID_STATUS')) {
        return NextResponse.json({ error: rpcErr.message }, { status: 400 });
      }
      return rpcErrorResponse(rpcErr.code, rpcErr.message, 'Action failed');
    }

    const { data: fullPatient, error: fetchErr } = await supabase
      .from('patients')
      .select('*, family_group:family_groups(*)')
      .eq('id', patient.id)
      .eq('clinic_id', clinicId)
      .single();

    if (fetchErr) throw fetchErr;

    return NextResponse.json({ patient: fullPatient });
  } catch (err) {
    return handleRouteError(err, '[PATCH /api/patients/[id]]');
  }
}
