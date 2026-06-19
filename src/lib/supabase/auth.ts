// ============================================================
// Server-side Auth Guard
//
// Reads the Supabase session from request cookies using the
// @supabase/ssr package. Call requireAuth() at the top of any
// API route handler that performs mutations (POST/PATCH/DELETE).
//
// Patient-facing read endpoints (GET /api/stats, etc.) should
// NOT use this — patients access via QR code without logging in.
// ============================================================

import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

/**
 * Verify the caller has a valid Supabase auth session.
 *
 * @returns The authenticated session object.
 * @throws  NextResponse with 401 status if unauthenticated.
 *
 * Usage in an API route:
 * ```ts
 * export async function POST(req: NextRequest) {
 *   const session = await requireAuth();
 *   // ... rest of handler
 * }
 * ```
 */
export async function requireAuth() {
  const cookieStore = cookies();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
          cookiesToSet.forEach(({ name, value, options }: { name: string; value: string; options?: Record<string, unknown> }) => {
            try {
              cookieStore.set(name, value, options);
            } catch {
              // In Route Handlers the response cookies can't always be set
              // when reading a GET — this is safe to ignore.
            }
          });
        },
      },
    }
  );

  const {
    data: { session },
    error,
  } = await supabase.auth.getSession();

  if (error || !session) {
    throw NextResponse.json(
      { error: 'Unauthorized — valid staff session required' },
      { status: 401 }
    );
  }

  return session;
}
