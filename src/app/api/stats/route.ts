import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getClinicId } from '@/lib/clinic-id';
import {
  calculateAvgConsultationTime,
  getLongestConsultation,
} from '@/lib/wait-engine';

export async function GET() {
  try {
    const supabase = createClient();
    const today    = new Date().toISOString().split('T')[0];

    // ── Clinic settings (scoped by clinic_id) ────────────────
    // After migration 003, each clinic has its own settings row
    // keyed by clinic_id. The old id=1 singleton fallback is no
    // longer needed.
    const { data: settingsData } = await supabase
      .from('clinic_settings')
      .select('*, current_token:patients(*, family_group:family_groups(*))')
      .eq('clinic_id', getClinicId())
      .maybeSingle();

    // ── Patients (scoped, with own clinic_id fallback) ───────
    const { data: allPatients, error: patientsErr } = await supabase
      .from('patients')
      .select('*')
      .eq('date_created', today)
      .eq('clinic_id', getClinicId());

    if (patientsErr) throw patientsErr;

    const patients           = allPatients ?? [];
    const waitingCount       = patients.filter((p) => p.status === 'WAITING').length;
    const completedToday     = patients.filter((p) => p.status === 'COMPLETED');
    const avgConsultation    = calculateAvgConsultationTime(
      completedToday,
      settingsData?.default_consultation_time ?? 8
    );
    const longestConsultation = getLongestConsultation(completedToday);

    return NextResponse.json({
      waitingCount,
      currentToken:               settingsData?.current_token ?? null,
      avgConsultationMinutes:     avgConsultation,
      isPaused:                   settingsData?.queue_paused ?? false,
      patientsServedToday:        completedToday.length,
      longestConsultationMinutes: longestConsultation,
    });
  } catch (err) {
    console.error('[GET /api/stats]', err);
    return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 });
  }
}
