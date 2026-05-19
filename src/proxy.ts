import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getIronSession } from 'iron-session';
import { sessionOptions } from '@/lib/session';
import { SessionData } from '@/types';

export default async function proxy(request: NextRequest) {
  const response = NextResponse.next();

  const session = await getIronSession<SessionData>(request, response, sessionOptions);

  if (!session.isLoggedIn) {
    // Preserve the intended destination so we can redirect back after login
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('callbackUrl', request.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  return response;
}

// Only run middleware on the dashboard and any future protected routes.
// Does NOT run on API routes, static files, or public auth pages.
export const config = {
  matcher: ['/dashboard/:path*'],
};
