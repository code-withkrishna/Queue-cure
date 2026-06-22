import { NextResponse, type NextRequest } from 'next/server';

/** Fast cookie check — avoids bundling Supabase into the proxy layer. */
function hasAuthCookie(request: NextRequest): boolean {
  return request.cookies.getAll().some(
    (cookie) => cookie.name.includes('-auth-token') && cookie.value.length > 0
  );
}

export function proxy(request: NextRequest) {
  if (!hasAuthCookie(request)) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = '/login';
    loginUrl.searchParams.set('next', request.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/reception/:path*'],
};
