// ============================================================
// Server-side Auth Guard
// ============================================================

import { isStaffEmail } from '@/lib/staff-auth';
import { createAuthClient } from '@/lib/supabase/server-auth';

export class AuthError extends Error {
  constructor() {
    super('Unauthorized');
    this.name = 'AuthError';
  }
}

export class ForbiddenError extends Error {
  constructor() {
    super('Forbidden');
    this.name = 'ForbiddenError';
  }
}

export async function requireAuth() {
  const supabase = await createAuthClient();

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    throw new AuthError();
  }

  if (!isStaffEmail(user.email)) {
    throw new ForbiddenError();
  }

  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    throw new AuthError();
  }

  return session;
}
