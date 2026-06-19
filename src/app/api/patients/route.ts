import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { requireAuth } from '@/lib/supabase/auth';
import { getClinicId } from '@/lib/clinic-id';
import { generateTokenNumber, generateAccessCode } from '@/lib/token';
import { classifyTriage } from '@/lib/triage';
import { AddPatientPayload } from '@/types';

// GET — active patients for today scoped to this clinic
export async function GET() {
  try {
    const supabase = createClient();
    const today    = new Date().toISOString().split('T')[0];

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
    console.error('[GET /api/patients]', err);
    return NextResponse.json({ error: 'Failed to fetch patients' }, { status: 500 });
  }
}

// POST — add patient: token generation + AI triage + insert
export async function POST(req: NextRequest) {
  try {
    await requireAuth();
    const body: AddPatientPayload = await req.json();

    if (!body.patient_name?.trim()) {
      return NextResponse.json({ error: 'Patient name is required' }, { status: 400 });
    }

    const supabase = createClient();
    const today    = new Date().toISOString().split('T')[0];

    // ── 1. Get last token for today (scoped to clinic) ───────
    const { data: lastPatient } = await supabase
      .from('patients')
      .select('token_number')
      .eq('date_created', today)
      .eq('clinic_id', getClinicId())
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    const nextToken = generateTokenNumber(lastPatient?.token_number ?? null);

    // ── 2. Unique QR access code ─────────────────────────────
    let accessCode = generateAccessCode();
    for (let i = 0; i < 10; i++) {
      const { data: collision } = await supabase
        .from('patients')
        .select('id')
        .eq('qr_access_code', accessCode)
        .maybeSingle();
      if (!collision) break;
      accessCode = generateAccessCode();
    }

    // ── 3. AI Triage (non-blocking) ──────────────────────────
    let aiPriority:     string | null = null;
    let aiPriorityNote: string | null = null;

    if (body.chief_complaint?.trim()) {
      const triage   = await classifyTriage(body.chief_complaint.trim());
      aiPriority     = triage.priority;
      aiPriorityNote = triage.note;
    }

    // ── 4. Insert ────────────────────────────────────────────
    const { data: patient, error: insertErr } = await supabase
      .from('patients')
      .insert({
        token_number:     nextToken,
        patient_name:     body.patient_name.trim(),
        phone:            body.phone?.trim() || null,
        family_group_id:  body.family_group_id || null,
        clinic_id:        getClinicId(),
        status:           'WAITING',
        qr_access_code:   accessCode,
        date_created:     today,
        chief_complaint:  body.chief_complaint?.trim() || null,
        ai_priority:      aiPriority,
        ai_priority_note: aiPriorityNote,
      })
      .select('*, family_group:family_groups(*)')
      .single();

    if (insertErr) throw insertErr;

    // ── 5. Audit ─────────────────────────────────────────────
    await supabase
      .from('queue_events')
      .insert({ patient_id: patient.id, event_type: 'PATIENT_ADDED' });

    return NextResponse.json({ patient }, { status: 201 });
  } catch (err) {
    console.error('[POST /api/patients]', err);
    return NextResponse.json({ error: 'Failed to add patient' }, { status: 500 });
  }
}
