import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { assertEnv } from '@/lib/env';

/**
 * Supabase client for staff auth (anon key + session cookies).
 * Must use await cookies() — required in Next.js 15+.
 */
export async function createAuthClient() {
  const cookieStore = await cookies();

  return createServerClient(
    assertEnv(process.env.NEXT_PUBLIC_SUPABASE_URL, 'NEXT_PUBLIC_SUPABASE_URL'),
    assertEnv(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, 'NEXT_PUBLIC_SUPABASE_ANON_KEY'),
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          } catch {
            // Safe to ignore in read-only Server Component contexts.
          }
        },
      },
    }
  );
}
