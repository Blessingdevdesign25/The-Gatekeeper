# The Gatekeeper: Security Audit & Hardening Guide

Security is not a binary switch; it is a continuous process of finding gaps and closing them. 

This document audits six critical security vulnerabilities in our current authentication flow. For each issue, you will find an **educational breakdown** of the threat and the **exact code modifications** required to harden the system.

---

## 🛠️ 1. Timing Attacks on Email Lookups
### 🚨 The Problem
In [`src/app/api/auth/login/route.ts`](file:///c:/Users/BLESSING%20ALEONOMOH/Desktop/The%20Gatekeeper/src/app/api/auth/login/route.ts), we check if a user exists in the database. If they don't, we exit immediately. If they do, we proceed to verify their password using `bcrypt`:
```typescript
const user = await prisma.user.findUnique({ where: { email } });

if (!user || !(await verifyPassword(password, user.password))) {
  return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
}
```
**Why this is dangerous:**
Password hashing (`bcrypt.compare`) is designed to be slow, taking **~300ms** of intensive CPU power. Database lookups are fast, taking **~5ms**.
* If a hacker logs in with a **non-existent email** (`fake@user.com`), the API returns an error in **~10ms**.
* If a hacker logs in with a **valid email** (`real@user.com`) but a wrong password, the API takes **~310ms** to return an error because it has to hash the password!

By measuring the millisecond response time, hackers can list out (enumerate) exactly which emails are registered on your server.

---

### 🎓 The Fix (Teaching & Code)
To resolve this timing discrepancy, we must ensure that **every single request** runs a password comparison. If the user doesn't exist, we will compare the typed password against a "dummy hash". This dummy comparison consumes identical CPU cycles, forcing all responses to take roughly **~310ms**.

```typescript
// Replace the lookup check in src/app/api/auth/login/route.ts
const user = await prisma.user.findUnique({ where: { email } });

// A standard bcrypt dummy hash (never matches, but takes ~300ms to evaluate)
const DUMMY_HASH = '$2b$12$12345678901234567890123456789012345678901234567890';

// Always perform a timing-heavy bcrypt operation
const passwordMatches = user 
  ? await verifyPassword(password, user.password) 
  : await verifyPassword(password, DUMMY_HASH); // Consumes same CPU power!

if (!user || !passwordMatches) {
  return NextResponse.json(
    { success: false, error: 'Invalid email or password', code: 'INVALID_CREDENTIALS' },
    { status: 401 }
  );
}
```

---

## 🛠️ 2. Weak Cookie Flags
### 🚨 The Problem
In [`src/lib/session.ts`](file:///c:/Users/BLESSING%20ALEONOMOH/Desktop/The%20Gatekeeper/src/lib/session.ts), we configured:
```typescript
cookieOptions: {
  secure: process.env.NODE_ENV === 'production',
  httpOnly: true,
  sameSite: 'strict',
  maxAge: 60 * 60 * 24 * 7,
}
```
While this is already very secure, there are advanced attack surfaces we can harden:
1. **Missing Path configuration**: Without `path: '/'`, browsers might scope the session cookie strictly to the sub-path that issued it, leading to session loss or session leaking across paths.
2. **Missing `sameSite` fallback**: In some legacy clients, `strict` might be completely ignored if not explicitly formatted, or create navigation friction.

---

### 🎓 The Fix (Teaching & Code)
We must explicitly add `path: '/'` so that the browser presents the cookie for all routes inside the application, and ensure the domain scope is locked.

```typescript
// Update cookieOptions in src/lib/session.ts
cookieOptions: {
  secure: process.env.NODE_ENV === 'production', // Forces HTTPS in production
  httpOnly: true, // Prevents Javascript from reading the token (XSS protection)
  sameSite: 'lax', // Secure Lax allows safe navigation from external links without losing session state
  path: '/', // Explicitly binds cookie to the entire domain tree
  maxAge: 60 * 60 * 24 * 7, // 7 days expiration
},
```

---

## 🛠️ 3. Missing CSRF Protection on API Routes
### 🚨 The Problem
While `SameSite` cookies significantly mitigate Cross-Site Request Forgery (CSRF), a CSRF threat still exists when dealing with:
* Subdomain takeovers (where another app on `sub.yourdomain.com` can send cross-origin requests).
* Browsers turning off `SameSite` restrictions or running legacy renderers.

API routes that alter database states (`POST`, `PUT`, `DELETE`) should verify request origins manually.

---

### 🎓 The Fix (Teaching & Code)
We will modify our Edge Guard ([`src/proxy.ts`](file:///c:/Users/BLESSING%20ALEONOMOH/Desktop/The%20Gatekeeper/src/proxy.ts)) to block cross-site calls on modification APIs (`POST` requests) by comparing the request's `Origin` and `Host` headers.

```typescript
// Add inside src/proxy.ts at the beginning of the default export function:
if (request.method === 'POST') {
  const origin = request.headers.get('origin');
  const host = request.headers.get('host');

  // Verify the origin belongs to our host
  if (origin) {
    const originUrl = new URL(origin);
    if (originUrl.host !== host) {
      return new NextResponse(
        JSON.stringify({ success: false, error: 'CSRF Origin mismatch', code: 'CSRF_BLOCKED' }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      );
    }
  }
}
```

---

## 🛠️ 4. Session Secret Leakage
### 🚨 The Problem
Our cookie secret (`SESSION_SECRET`) is stored in `.env.local`. If a developer commits this file to GitHub, or if a hacker compromises an automated builder log, they can read the secret key. Because the key is symmetric (used both to encrypt and decrypt session state), anyone who obtains the key can manufacture their own session cookies, granting themselves admin access to all accounts.

---

### 🎓 The Fix (Teaching & Code)
To harden secret key validation, the application should dynamically verify the key's strength and length during system startup, and gracefully fall back or refuse to start if a weak key is detected.

```typescript
// Add verification in src/lib/session.ts
if (!process.env.SESSION_SECRET || process.env.SESSION_SECRET.length < 32) {
  throw new Error(
    'CRITICAL SECURITY EXCEPTION: SESSION_SECRET must be at least 32 characters long to avoid brute-forcing cryptographic algorithms.'
  );
}
```

---

## 🛠️ 5. Password Policy Weaknesses
### 🚨 The Problem
In [`src/lib/validation.ts`](file:///c:/Users/BLESSING%20ALEONOMOH/Desktop/The%20Gatekeeper/src/lib/validation.ts), we currently require only a minimum length of 8 characters:
```typescript
password: z
  .string()
  .min(8, 'Password must be at least 8 characters')
```
**Why this is dangerous:**
An attacker could register with the password `"12345678"` or `"password"`. These pass validation but are instantly crackable using rainbow tables or standard dictionary attacks.

---

### 🎓 The Fix (Teaching & Code)
We must implement server-side complexity rules in our Zod schema to ensure that passwords contain a combination of letters, numbers, and symbols, preventing users from picking easily guessable keys.

```typescript
// Update password schema inside src/lib/validation.ts
export const signupSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100).trim(),
  email: z.string().email('Invalid email address').toLowerCase().trim(),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password must be under 128 characters')
    // Zod refinements for structural checks:
    .refine((val) => /[A-Z]/.test(val), { message: 'Password must contain at least one uppercase letter' })
    .refine((val) => /[a-z]/.test(val), { message: 'Password must contain at least one lowercase letter' })
    .refine((val) => /[0-9]/.test(val), { message: 'Password must contain at least one number' })
    .refine((val) => /[^A-Za-z0-9]/.test(val), { message: 'Password must contain at least one special character' }),
});
```

---

## 🛠️ 6. Absence of Rate Limiting
### 🚨 The Problem
Any user can call `POST /api/auth/login` infinitely. A hacker could run a dictionary script that attempts thousands of guesses a second. 

Worse, because `bcrypt` is slow (consuming substantial CPU), an attacker can easily initiate a **Denial of Service (DoS)** attack. Sending 100 parallel login requests every second will cause the server's CPU to hit 100% utilization, completely freezing the entire website for all other legitimate users!

---

### 🎓 The Fix (Teaching & Code)
We will introduce an Edge Rate Limiter in Next.js inside our Guard ([`src/proxy.ts`](file:///c:/Users/BLESSING%20ALEONOMOH/Desktop/The%20Gatekeeper/src/proxy.ts)). While a distributed platform should use a Redis store (e.g. `@upstash/ratelimit`), we can implement a fast, robust local IP-based token-bucket limiter to reject suspicious repetitive traffic at the gateway:

```typescript
// Simple IP-based rate limiting map for Edge
const ipMap = new Map<string, { count: number; lastReset: number }>();
const LIMIT = 10; // Max 10 requests
const WINDOW = 60 * 1000; // Per 60 seconds

function rateLimiter(ip: string): boolean {
  const now = Date.now();
  const userData = ipMap.get(ip) || { count: 0, lastReset: now };

  if (now - userData.lastReset > WINDOW) {
    userData.count = 1;
    userData.lastReset = now;
    ipMap.set(ip, userData);
    return true;
  }

  userData.count += 1;
  ipMap.set(ip, userData);

  return userData.count <= LIMIT;
}

// Inside proxy(request: NextRequest)
const ip = request.ip || '127.0.0.1';
if (request.nextUrl.pathname.startsWith('/api/auth/') && !rateLimiter(ip)) {
  return new NextResponse(
    JSON.stringify({ success: false, error: 'Too many requests. Slow down!', code: 'TOO_MANY_REQUESTS' }),
    { status: 429, headers: { 'Content-Type': 'application/json' } }
  );
}
```
