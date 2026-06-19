// ============================================================
// Auth Callback — PKCE code exchange
//
// @supabase/ssr uses the PKCE flow by default for browser clients.
// signInWithOtp() does NOT hand the browser a session directly —
// the magic link points here with a `?code=...` param, which must
// be exchanged server-side for a session before the user is sent
// on to the app. Without this route, getSession() on /reception
// always comes back empty and the user gets bounced to /login.
// ============================================================

import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/reception';

  if (code) {
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
            cookiesToSet.forEach(({ name, value, options }) => {
              try {
                cookieStore.set(name, value, options);
              } catch {
                // Safe to ignore if called from a context that can't set cookies.
              }
            });
          },
        },
      }
    );

    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }

    console.error('[auth/callback] exchangeCodeForSession failed:', error.message);
  }

  // No code, or exchange failed — send back to login with an error flag.
  return NextResponse.redirect(`${origin}/login?error=auth_failed`);
}
