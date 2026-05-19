import { getIronSession } from 'iron-session';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { sessionOptions } from './session';
import { SessionData } from '@/types';

// Returns the current session (or an empty session if not logged in).
// Use this when you want to check login state without redirecting.
export async function getSession() {
  const cookieStore = await cookies();
  return getIronSession<SessionData>(cookieStore, sessionOptions);
}

// Returns the current session if the user is logged in.
// Redirects to /login if not. Use this at the top of protected pages.
export async function requireAuth(): Promise<SessionData> {
  const session = await getSession();

  if (!session.isLoggedIn || !session.userId) {
    redirect('/login');
  }

  return {
    userId: session.userId,
    name: session.name,
    email: session.email,
    isLoggedIn: true,
  };
}
