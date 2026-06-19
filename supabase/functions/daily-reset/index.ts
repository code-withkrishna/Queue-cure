// ============================================================
// Queue Cure — Daily Reset Edge Function
// Scheduled: 0 0 * * * (midnight daily)
// Clears current_token_id + unpauses queue for fresh start
//
// Deploy:  supabase functions deploy daily-reset
// Schedule: Supabase Dashboard → Edge Functions → daily-reset
//           → Schedule → Cron: 0 0 * * *
// ============================================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

Deno.serve(async (_req) => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')! // service role needed for direct table access
  );

  const timestamp = new Date().toISOString();

  // Reset all clinic_settings rows for a fresh day:
  // - Clear current token
  // - Unpause queue (doctor is available at start of day)
  const { error: resetError } = await supabase
    .from('clinic_settings')
    .update({
      current_token_id: null,
      queue_paused:     false,
    })
    .neq('id', 0); // matches all rows

  if (resetError) {
    console.error('[daily-reset] settings error:', resetError.message);
    return new Response(
      JSON.stringify({ error: resetError.message, timestamp }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }

  console.log('[daily-reset] Complete at', timestamp);

  return new Response(
    JSON.stringify({ message: 'Daily reset complete', timestamp }),
    { status: 200, headers: { 'Content-Type': 'application/json' } }
  );
});
