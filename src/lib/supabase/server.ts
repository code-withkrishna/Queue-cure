import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { requireEnv } from '@/lib/env';

// ============================================================
// Server-side Supabase client — SERVICE ROLE KEY
//
// FIX 5: Switch from anon key to service role key for all API
// routes. Service role bypasses RLS entirely, which means:
//  - API routes (POST/PATCH/DELETE) can mutate freely
//  - RLS can now be tightened to anon-read-only (migration 002)
//  - Anon key in the browser is truly read-only — no deletes possible
//
// IMPORTANT: Never import this in client components.
//            Never expose SUPABASE_SERVICE_ROLE_KEY to the browser.
// ============================================================

export function createClient() {
  return createSupabaseClient(
    requireEnv('NEXT_PUBLIC_SUPABASE_URL'),
    requireEnv('SUPABASE_SERVICE_ROLE_KEY'),
    {
      auth: {
        autoRefreshToken: false,
        persistSession:   false,
      },
    }
  );
}
