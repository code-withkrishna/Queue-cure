import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { requireAuth } from '@/lib/supabase/auth';
import { getClinicId } from '@/lib/clinic-id';

export async function POST() {
  try {
    await requireAuth();
    const supabase = createClient();

    const { data: settings, error: fetchErr } = await supabase
      .from('clinic_settings')
      .select('queue_paused')
      .eq('clinic_id', getClinicId())
      .single();

    if (fetchErr) throw fetchErr;

    const newPaused = !settings.queue_paused;

    const { data: updated, error: updateErr } = await supabase
      .from('clinic_settings')
      .update({ queue_paused: newPaused })
      .eq('clinic_id', getClinicId())
      .select()
      .single();

    if (updateErr) throw updateErr;

    return NextResponse.json({ queue_paused: updated.queue_paused });
  } catch (err) {
    console.error('[POST /api/queue/toggle-pause]', err);
    return NextResponse.json({ error: 'Failed to toggle queue' }, { status: 500 });
  }
}
