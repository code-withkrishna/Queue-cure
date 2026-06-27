import { after } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { classifyTriage } from '@/lib/triage';

/**
 * Runs AI triage in the background and updates the patient row.
 * Failures are logged; registration is never blocked.
 *
 * Uses Next.js `after()` instead of a detached fire-and-forget
 * promise: on serverless runtimes (Vercel), a bare `void (async..)()`
 * called after the response has already been sent is NOT guaranteed
 * to finish executing — the function instance can be frozen/recycled
 * as soon as the response is flushed. `after()` schedules this work
 * to run within the same request lifecycle and is guaranteed to
 * complete before the runtime tears down the invocation.
 */
export function scheduleTriageUpdate(patientId: string, complaint: string): void {
  after(async () => {
    try {
      const triage   = await classifyTriage(complaint);
      const supabase = createClient();

      const { error } = await supabase
        .from('patients')
        .update({
          ai_priority:      triage.priority,
          ai_priority_note: triage.note,
        })
        .eq('id', patientId);

      if (error) {
        console.error('[scheduleTriageUpdate] update failed:', error);
      }
    } catch (err) {
      console.error('[scheduleTriageUpdate]', err);
    }
  });
}
