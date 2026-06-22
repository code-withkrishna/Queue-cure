import { NextResponse } from 'next/server';
import { AuthError, ForbiddenError } from '@/lib/supabase/auth';
import { ValidationError } from '@/lib/validation';

export function handleRouteError(err: unknown, context: string): NextResponse {
  if (err instanceof ValidationError) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
  if (err instanceof AuthError) {
    return NextResponse.json(
      { error: 'Unauthorized — valid staff session required' },
      { status: 401 }
    );
  }
  if (err instanceof ForbiddenError) {
    return NextResponse.json(
      { error: 'Forbidden — this email is not authorized for staff access' },
      { status: 403 }
    );
  }
  if (err instanceof NextResponse) {
    return err;
  }
  console.error(context, err);
  return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
}

export function rpcErrorResponse(
  code: string | undefined,
  message: string,
  fallback: string
): NextResponse {
  if (code === 'P0001' || message.includes('ACTIVE_CALL_EXISTS')) {
    return NextResponse.json({ error: message || 'A patient is already being called' }, { status: 409 });
  }
  if (code === 'P0002' || message.includes('NO_PATIENTS_WAITING')) {
    return NextResponse.json({ error: 'No patients waiting' }, { status: 404 });
  }
  if (code === '23505' || message.includes('duplicate key')) {
    return NextResponse.json({ error: 'Token conflict — please retry' }, { status: 409 });
  }
  return NextResponse.json({ error: fallback }, { status: 500 });
}
