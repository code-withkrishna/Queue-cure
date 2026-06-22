import { createClient } from '@/lib/supabase/server';
import { classifyTriage } from '@/lib/triage';

/**
 * Runs AI triage in the background and updates the patient row.
 * Failures are logged; registration is never blocked.
 */
export function scheduleTriageUpdate(patientId: string, complaint: string): void {
  void (async () => {
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
  })();
}
