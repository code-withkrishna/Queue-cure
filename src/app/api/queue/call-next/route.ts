import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { requireAuth } from '@/lib/supabase/auth';
import { getClinicId } from '@/lib/clinic-id';

// Priority order: EMERGENCY (0) > URGENT (1) > ROUTINE (2) > unset (3)
// Within same priority: FIFO by created_at
const PRIORITY_ORDER: Record<string, number> = {
  EMERGENCY: 0,
  URGENT:    1,
  ROUTINE:   2,
};

export async function POST() {
  try {
    await requireAuth();
    const supabase = createClient();
    const today    = new Date().toISOString().split('T')[0];

    // ── Guard: no double-call ────────────────────────────────
    const { data: already } = await supabase
      .from('patients')
      .select('id, token_number')
      .eq('status', 'CALLED')
      .eq('date_created', today)
      .eq('clinic_id', getClinicId())
      .maybeSingle();

    if (already) {
      return NextResponse.json(
        { error: `Token ${already.token_number} is still active. Complete or skip it first.` },
        { status: 400 }
      );
    }

    // ── FIX 4: Fetch ALL waiting patients then sort by priority ─
    // Supabase JS client can't do ORDER BY CASE natively, so we
    // fetch all WAITING patients and sort in-process.
    // EMERGENCY patients jump the queue; within same priority, FIFO applies.
    const { data: waiting, error: fetchErr } = await supabase
      .from('patients')
      .select('*, family_group:family_groups(*)')
      .eq('status', 'WAITING')
      .eq('date_created', today)
      .eq('clinic_id', getClinicId())
      .order('created_at', { ascending: true }); // base FIFO — overridden below

    if (fetchErr) throw fetchErr;

    if (!waiting || waiting.length === 0) {
      return NextResponse.json({ error: 'No patients waiting' }, { status: 404 });
    }

    // Sort: priority first, then FIFO within same priority
    const sorted = [...waiting].sort((a, b) => {
      const aOrd = PRIORITY_ORDER[a.ai_priority ?? ''] ?? 3;
      const bOrd = PRIORITY_ORDER[b.ai_priority ?? ''] ?? 3;
      if (aOrd !== bOrd) return aOrd - bOrd; // priority wins
      // Same priority → FIFO (created_at ascending)
      return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
    });

    const next = sorted[0]; // highest priority, earliest in queue
    const now  = new Date().toISOString();

    // ── Call patient ─────────────────────────────────────────
    const { data: called, error: callErr } = await supabase
      .from('patients')
      .update({ status: 'CALLED', called_at: now })
      .eq('id', next.id)
      .select('*, family_group:family_groups(*)')
      .single();

    if (callErr) throw callErr;

    // ── Update clinic settings ───────────────────────────────
    await supabase
      .from('clinic_settings')
      .update({ current_token_id: next.id })
      .eq('clinic_id', getClinicId());

    // ── Audit ────────────────────────────────────────────────
    await supabase
      .from('queue_events')
      .insert({ patient_id: next.id, event_type: 'TOKEN_CALLED' });

    return NextResponse.json({ patient: called });
  } catch (err) {
    console.error('[POST /api/queue/call-next]', err);
    return NextResponse.json({ error: 'Failed to call next patient' }, { status: 500 });
  }
}
