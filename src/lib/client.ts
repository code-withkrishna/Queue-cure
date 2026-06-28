import { createBrowserClient } from '@supabase/ssr';
import { assertEnv } from '@/lib/env';

export function createClient() {
  return createBrowserClient(
    assertEnv(process.env.NEXT_PUBLIC_SUPABASE_URL, 'NEXT_PUBLIC_SUPABASE_URL'),
    assertEnv(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, 'NEXT_PUBLIC_SUPABASE_ANON_KEY')
  );
}
