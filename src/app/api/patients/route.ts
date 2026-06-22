import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { requireAuth } from '@/lib/supabase/auth';
import { getClinicId } from '@/lib/clinic-id';
import { getTodayDate } from '@/lib/date';
import { handleRouteError } from '@/lib/api-utils';
import { scheduleTriageUpdate } from '@/lib/triage-worker';
import { validateAddPatientPayload } from '@/lib/validation';
import { AddPatientPayload } from '@/types';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    await requireAuth();
    const supabase = createClient();
    const today    = getTodayDate();

    const { data: patients, error } = await supabase
      .from('patients')
      .select('*, family_group:family_groups(*)')
      .eq('date_created', today)
      .eq('clinic_id', getClinicId())
      .in('status', ['WAITING', 'CALLED'])
      .order('created_at', { ascending: true });

    if (error) throw error;
    return NextResponse.json({ patients: patients ?? [] });
  } catch (err) {
    return handleRouteError(err, '[GET /api/patients]');
  }
}

export async function POST(req: NextRequest) {
  try {
    await requireAuth();
    const body: AddPatientPayload = await req.json();
    const validated = validateAddPatientPayload(body);

    const supabase = createClient();
    const today    = getTodayDate();
    const clinicId = getClinicId();

    const { data: patient, error: insertErr } = await supabase.rpc('create_patient_record', {
      p_clinic_id:        clinicId,
      p_today:            today,
      p_patient_name:     validated.patient_name,
      p_phone:            validated.phone ?? null,
      p_family_group_id:  validated.family_group_id ?? null,
      p_chief_complaint:  validated.chief_complaint ?? null,
      p_ai_priority:      null,
      p_ai_priority_note: null,
    });

    if (insertErr) throw insertErr;

    if (validated.chief_complaint?.trim()) {
      scheduleTriageUpdate(patient.id, validated.chief_complaint);
    }

    const { data: fullPatient, error: fetchErr } = await supabase
      .from('patients')
      .select('*, family_group:family_groups(*)')
      .eq('id', patient.id)
      .single();

    if (fetchErr) throw fetchErr;

    return NextResponse.json({ patient: fullPatient }, { status: 201 });
  } catch (err) {
    return handleRouteError(err, '[POST /api/patients]');
  }
}
