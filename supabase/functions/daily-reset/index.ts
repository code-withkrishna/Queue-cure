// ============================================================
// Queue Cure — Daily Reset Edge Function
// Scheduled: 0 0 * * * (midnight daily)
// ============================================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

Deno.serve(async (_req) => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  const timestamp = new Date().toISOString();

  const { error: archiveErr } = await supabase.rpc('archive_stale_queue_days');
  if (archiveErr) {
    console.error('[daily-reset] archive error:', archiveErr.message);
    return new Response(
      JSON.stringify({ error: archiveErr.message, timestamp }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const { error: resetError } = await supabase
    .from('clinic_settings')
    .update({
      current_token_id: null,
      queue_paused:     false,
    })
    .neq('id', 0);

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
