# Architecture

This document explains the key design decisions behind The Gatekeeper and the reasoning behind each one. It is written for a developer who wants to understand *why* things are built the way they are, not just *how* to run them.

---

## Request Lifecycle

```
Browser
  │
  ▼
Next.js Middleware (Edge)          ← First line of defence for /dashboard
  │  reads iron-session cookie
  │  if missing/invalid → redirect /login
  │
  ▼
Page Server Component              ← Second check: requireAuth() helper
  │  calls getSession() on the request
  │  if session invalid → redirect /login
  │  renders the page with user data from session
  │
  ▼
API Route (POST /api/auth/login)   ← All mutations go through server routes
  │  1. Parse + validate body with Zod
  │  2. Look up user in Prisma
  │  3. Compare password hash with bcrypt
  │  4. On success: seal session into iron-session cookie
  │  5. Return 200 or 401
```

The double-check (middleware + page component) is intentional. Middleware runs at the edge and is fast, but it cannot do database queries. The page component can, so it is the authoritative check. If the middleware misses something (a stale cookie that hasn't been invalidated yet, for example), the page component catches it.

---

## Why iron-session Instead of NextAuth?

NextAuth is excellent for OAuth flows (Google, GitHub, etc.) and teams that need a large feature surface quickly. For this project the requirements are simpler:

- Email + password only, no third-party providers
- Full control over the session data shape
- No external database adapter complexity for sessions (they live in the cookie)
- Easier to understand for someone learning auth fundamentals

iron-session encrypts a JSON payload into a cookie using AES-GCM. The session is stateless — the server does not store it. This means there is no session table in the database, no session store to manage, and no lookup on every request. The tradeoff is that you cannot invalidate a specific session server-side before it expires (beyond clearing the cookie on the client). For a user-facing product that needs "log out everywhere", you would add a `sessionVersion` integer to the user record and store the version in the cookie — increment it on logout and reject cookies with an older version.

---

## Why Prisma + SQLite for Development?

SQLite has zero setup, produces a single file (`dev.db`), and is excellent for local development and testing. Prisma's data model is database-agnostic — switching to PostgreSQL for production requires changing one line in `schema.prisma` and one environment variable. The schema does not use any SQLite-specific types, so migration is frictionless.

---

## Validation Strategy

Zod schemas are defined once in `src/lib/validation.ts` and used in two places:

1. **API routes (server)** — mandatory. The server parses and validates every request body before touching Prisma or bcrypt. Invalid data is rejected with a 400 and a structured error object.

2. **Form components (client)** — optional but ergonomic. The same schema runs in the browser to give immediate feedback without a round trip. Critically, client-side validation is never the *only* validation. The server always validates too.

This single-source-of-truth approach means the client and server can never disagree about what constitutes a valid email address or password.

---

## Password Strength Meter

The live strength meter is a **pure client-side UX feature** — it is not a security control. A user could theoretically bypass it by calling the API directly. This is fine because the server enforces minimum password requirements through the Zod schema (minimum 8 characters). The strength meter uses a scoring heuristic that checks for length, uppercase, lowercase, digits, and symbols and maps the result to one of four levels: weak, fair, strong, very strong.

The meter lives in `usePasswordStrength` (a custom hook) and `PasswordStrengthMeter` (the visual component). They are decoupled so the hook can be tested independently.

---

## Route Groups: `(auth)`

The `(auth)` directory is a Next.js route group. It has no effect on the URL — `/login` and `/signup` are the actual paths. The group exists to allow a shared layout for the auth pages (centered card, no navigation) without affecting the root layout (used by the landing page and dashboard).

---

## Middleware Placement

`src/middleware.ts` sits at the `src/` root, which matches Next.js's expected location. The `matcher` config in the middleware restricts execution to `/dashboard` and any sub-paths. The middleware does not run on API routes, static files, or the public auth pages.

---

## Session Data Shape

```typescript
interface SessionData {
  userId: string;
  name: string;
  email: string;
  isLoggedIn: boolean;
}
```

The session stores the user's name and email to avoid a database round trip on every dashboard render. The risk is stale data — if a user changes their email, the session will show the old one until they log out and back in. For this application's scope this is an acceptable tradeoff. In production you would add a `sessionVersion` field (see above) or fetch the user from the database on sensitive pages.

---

## Error Handling Conventions

API routes return a consistent JSON shape on both success and failure:

```typescript
// Success
{ success: true, data: { ... } }

// Failure
{ success: false, error: "Human-readable message", code: "MACHINE_READABLE_CODE" }
```

The client always checks `success` before accessing `data`. This prevents runtime errors from undefined fields and makes error handling explicit.

---

## What This Project Does Not Cover

This is intentionally a minimal, correct foundation. Production systems would also want:

- **Email verification** — confirm the address belongs to the registrant before granting access.
- **Password reset flow** — time-limited tokens sent via email.
- **Rate limiting** — prevent credential stuffing on `/api/auth/login`. (`@upstash/ratelimit` with Redis is a natural Next.js fit.)
- **CSRF protection** — iron-session cookies use `SameSite=Strict` which mitigates most CSRF attacks, but an explicit CSRF token is belt-and-suspenders for high-security contexts.
- **Audit logging** — record every login attempt (success and failure) with timestamp and IP.
- **Account lockout** — temporarily lock an account after N failed attempts.
- **Multi-factor authentication** — TOTP (Google Authenticator) or WebAuthn.

Each of these is a natural extension of this foundation. The architecture is designed to accommodate them without a rewrite.
