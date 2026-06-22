import { NextResponse } from 'next/server';
import { isStaffEmail } from '@/lib/staff-auth';
import { createAuthClient } from '@/lib/supabase/server-auth';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/reception';

  if (code) {
    const supabase = await createAuthClient();

    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error && data.session) {
      if (!isStaffEmail(data.session.user.email)) {
        await supabase.auth.signOut();
        return NextResponse.redirect(`${origin}/login?error=forbidden`);
      }
      return NextResponse.redirect(`${origin}${next}`);
    }

    console.error('[auth/callback] exchangeCodeForSession failed:', error?.message);
  }

  return NextResponse.redirect(`${origin}/login?error=auth_failed`);
}
