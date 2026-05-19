import { SessionOptions } from 'iron-session';
import { SessionData } from '@/types';

if (!process.env.SESSION_SECRET) {
  throw new Error('SESSION_SECRET environment variable is not set. See .env.example');
}

export const sessionOptions: SessionOptions = {
  password: process.env.SESSION_SECRET,
  cookieName: 'gatekeeper-session',
  cookieOptions: {
    // In production (HTTPS), the Secure flag is mandatory.
    // In development (HTTP on localhost), set it to false.
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    sameSite: 'strict',
    maxAge: 60 * 60 * 24 * 7, // 7 days in seconds
  },
};

// Augment iron-session's type so TypeScript knows what's in the cookie.
declare module 'iron-session' {
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  interface IronSessionData extends SessionData {}
}
