import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { requireAuth } from '@/lib/supabase/auth';
import { getClinicId } from '@/lib/clinic-id';
import { PatientAction, PatientStatus, QueueEventType } from '@/types';

const ACTION_TO_STATUS: Record<PatientAction, PatientStatus> = {
  call:     'CALLED',
  complete: 'COMPLETED',
  skip:     'SKIPPED',
  cancel:   'CANCELLED',
};

const ACTION_TO_EVENT: Record<PatientAction, QueueEventType> = {
  call:     'TOKEN_CALLED',
  complete: 'COMPLETED',
  skip:     'SKIPPED',
  cancel:   'CANCELLED',
};

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requireAuth();
    const { action }: { action: PatientAction } = await req.json();
    const { id } = params;

    if (!action || !ACTION_TO_STATUS[action]) {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    const supabase = createClient();

    // ── Fetch current patient ────────────────────────────────
    const { data: patient, error: fetchErr } = await supabase
      .from('patients')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchErr || !patient) {
      return NextResponse.json({ error: 'Patient not found' }, { status: 404 });
    }

    const now = new Date().toISOString();

    // ── Validate state transitions ───────────────────────────
    if (action === 'call'     && patient.status !== 'WAITING') {
      return NextResponse.json({ error: 'Patient must be WAITING to call' }, { status: 400 });
    }
    if (action === 'complete' && patient.status !== 'CALLED') {
      return NextResponse.json({ error: 'Patient must be CALLED to complete' }, { status: 400 });
    }
    if (action === 'skip'     && patient.status !== 'CALLED') {
      return NextResponse.json({ error: 'Patient must be CALLED to skip' }, { status: 400 });
    }

    // ── Double-call guard ────────────────────────────────────
    if (action === 'call') {
      const { data: activeCall } = await supabase
        .from('patients')
        .select('id, token_number')
        .eq('status', 'CALLED')
        .eq('date_created', patient.date_created)
        .maybeSingle();

      if (activeCall) {
        return NextResponse.json(
          { error: `Token ${activeCall.token_number} is currently being called. Complete or skip first.` },
          { status: 409 }
        );
      }
    }

    // ── Build update payload ─────────────────────────────────
    const updates: Record<string, unknown> = {
      status: ACTION_TO_STATUS[action],
    };

    if (action === 'call')     updates.called_at = now;
    if (action === 'complete') updates.completed_at = now;

    // Skip → mark SKIPPED first (for clean audit, called_at cleared)
    if (action === 'skip') {
      updates.called_at = null;
      updates.status    = 'SKIPPED';
    }

    // ── Apply primary update ─────────────────────────────────
    const { data: updated, error: updateErr } = await supabase
      .from('patients')
      .update(updates)
      .eq('id', id)
      .select('*, family_group:family_groups(*)')
      .single();

    if (updateErr) throw updateErr;

    // ── Sync clinic_settings.current_token_id ────────────────
    if (action === 'call') {
      await supabase
        .from('clinic_settings')
        .update({ current_token_id: id })
        .eq('clinic_id', getClinicId());
    }
    if (['complete', 'skip', 'cancel'].includes(action)) {
      const { data: settings } = await supabase
        .from('clinic_settings')
        .select('current_token_id')
        .eq('clinic_id', getClinicId())
        .single();
      if (settings?.current_token_id === id) {
        await supabase
          .from('clinic_settings')
          .update({ current_token_id: null })
          .eq('clinic_id', getClinicId());
      }
    }

    // ── Audit log ────────────────────────────────────────────
    await supabase
      .from('queue_events')
      .insert({ patient_id: id, event_type: ACTION_TO_EVENT[action] });

    // ── BUG 3 FIX: skip re-queue with fresh timestamp ────────
    // Problem: using the `now` captured at request START means if this
    // second update races with another skip, both get identical timestamps
    // and FIFO ordering breaks. Fix: capture a NEW timestamp here, at the
    // exact moment of re-queue. toISOString() is always UTC so no timezone
    // drift between server and Supabase.
    if (action === 'skip') {
      const reQueueAt = new Date().toISOString(); // ← fresh, not stale `now`

      await supabase
        .from('patients')
        .update({
          status:     'WAITING',
          created_at: reQueueAt, // pushed to end of FIFO queue
        })
        .eq('id', id);

      await supabase
        .from('queue_events')
        .insert({ patient_id: id, event_type: 'REJOINED' });
    }

    return NextResponse.json({ patient: updated });
  } catch (err) {
    console.error('[PATCH /api/patients/[id]]', err);
    return NextResponse.json({ error: 'Failed to update patient' }, { status: 500 });
  }
}
