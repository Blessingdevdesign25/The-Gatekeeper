# Security Model

This document describes the security posture of The Gatekeeper — what it protects against, why each control is in place, and what is out of scope.

---

## Threat Model

| Threat | Likelihood | Impact | Control |
|--------|-----------|--------|---------|
| Password database breach | Medium | High | bcrypt hashing (cost factor 12) |
| Session hijacking | Low | High | HTTP-only cookie, Secure flag, SameSite=Strict |
| Client-side tampering | High | Low | Server-side Zod validation on every request |
| Credential stuffing | High | Medium | (Rate limiting — not yet implemented; see roadmap) |
| XSS stealing session token | Low | High | HTTP-only cookie — JavaScript cannot read it |
| CSRF forging authenticated requests | Low | Medium | SameSite=Strict cookie attribute |
| Plaintext password logging | Low | Critical | Passwords never logged; only hashes enter the DB |
| Prototype pollution via user input | Low | Medium | Zod parsing creates a new, clean object — no `req.body` spread |

---

## Password Hashing

Passwords are hashed with **bcrypt** at a work factor of `12`.

Why bcrypt and not SHA-256 or MD5?

- SHA-256 and MD5 are designed to be fast. That is the wrong property for password storage — fast hashing means an attacker with your database can try billions of guesses per second.
- bcrypt is designed to be slow and tunable. At cost factor 12, a single hash takes roughly 250–400ms on modern hardware. This limits an attacker to a few hashes per second even with specialised hardware.
- bcrypt automatically generates and stores a cryptographically random salt. No two password hashes will be identical even if the passwords are the same, defeating rainbow table attacks.

The cost factor `12` is a reasonable default in 2025. As hardware becomes faster, increment this — re-hashing on next login is the standard approach.

**Implementation:**

```typescript
// src/lib/password.ts
import bcrypt from 'bcrypt';

const COST_FACTOR = 12;

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, COST_FACTOR);
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}
```

Note that `bcrypt.compare` is timing-safe: it does not short-circuit on the first differing character, preventing timing attacks.

---

## Session Management

Sessions are handled by **iron-session**.

### How it works

1. On successful login, the server creates a session object (`{ userId, name, email, isLoggedIn: true }`).
2. iron-session seals this object using AES-256-GCM encryption with the `SESSION_SECRET` key.
3. The sealed token is set as a cookie with these attributes:

```
Set-Cookie: gatekeeper-session=<sealed-token>;
  HttpOnly;        ← JavaScript cannot read this
  Secure;          ← Only sent over HTTPS
  SameSite=Strict; ← Not sent on cross-site requests (CSRF mitigation)
  Path=/;
  Max-Age=604800;  ← 7 days
```

4. On every subsequent request, the browser sends the cookie. The server decrypts it and reads the session without a database query.
5. On logout, the server sends a `Set-Cookie` header that overwrites the session cookie with an empty, immediately-expired value.

### Why `HttpOnly`?

JavaScript running in the browser — including any injected via XSS — cannot read `HttpOnly` cookies. Even if an attacker injects a script into your page, they cannot steal the session token.

### Why `Secure`?

The `Secure` flag means the browser will only send the cookie over HTTPS connections. On `localhost` in development, browsers make an exception and send `Secure` cookies over HTTP. In production, HTTPS is mandatory.

### Why `SameSite=Strict`?

`SameSite=Strict` means the cookie is **never** sent on a request that originated from a different site. If a user clicks a link on `evil.com` that points to your application, the request arrives without the session cookie. This defeats classic CSRF attacks where the attacker tricks a logged-in user into making an authenticated request.

The tradeoff: users who click a link to your app from an email or another site will appear logged-out on their first load. For most applications this is acceptable. If not, `SameSite=Lax` is a reasonable middle ground.

### Session Secret

`SESSION_SECRET` must be:

- At minimum 32 characters of random data.
- Never committed to version control.
- Different for each environment (development, staging, production).
- Rotated periodically. When rotated, all existing sessions are immediately invalidated (users must log in again).

Generate one:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

## Input Validation

All user input is validated with **Zod** on the server before any business logic runs.

```typescript
// src/lib/validation.ts
import { z } from 'zod';

export const signupSchema = z.object({
  name: z.string().min(1).max(100).trim(),
  email: z.string().email().toLowerCase().trim(),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password must be under 128 characters'),
});

export const loginSchema = z.object({
  email: z.string().email().toLowerCase().trim(),
  password: z.string().min(1),
});
```

Zod's `.parse()` throws if validation fails and returns a **new, clean object** — not a reference to the original input. This means:

- Prototype pollution via `__proto__` keys in the request body is impossible — Zod creates a plain object with only the declared fields.
- Extra fields the client sends are silently stripped (`.strip()` is the default).
- Type coercion is explicit — you cannot accidentally treat a number as a string.

The API routes return structured validation errors so the client can highlight the specific field that failed:

```json
{
  "success": false,
  "error": "Validation failed",
  "fields": {
    "email": "Invalid email address",
    "password": "Password must be at least 8 characters"
  }
}
```

---

## Route Protection

Protected routes are enforced at two layers:

**Layer 1 — Next.js Middleware (Edge Network)**

`src/middleware.ts` runs before the page is rendered. It reads the session cookie, verifies it, and redirects to `/login` if the session is invalid. This layer is fast but cannot query the database.

**Layer 2 — Page Server Component**

Every protected page calls `requireAuth()` at the top of the server component. This performs a second session check and optionally validates that the user still exists in the database. If the check fails, it redirects to `/login`.

Two layers exist because middleware operates at the edge and cannot access Prisma. The server component is the authoritative check. The middleware handles the common case (no cookie) before the request even reaches the origin server.

---

## What Is NOT In Scope

The following security controls are real concerns for production systems but are outside the scope of this reference implementation:

**Rate limiting** — The login endpoint has no rate limiting. A determined attacker can attempt unlimited password guesses. In production, add `@upstash/ratelimit` with Redis or a similar solution. Limit to ~5 failed attempts per IP per 15 minutes with exponential backoff.

**Account lockout** — Related to rate limiting. Consider locking an account temporarily after N consecutive failed login attempts.

**Email verification** — Accounts are active immediately after signup. There is no check that the email address belongs to the person who registered. In production, send a verification link before granting dashboard access.

**Password reset** — There is no "forgot password" flow. In production this requires generating a short-lived, single-use token, emailing it, and using it to authorize a password change.

**Content Security Policy** — No CSP header is set. Adding one prevents many categories of XSS.

**HTTPS enforcement** — The application trusts the host to enforce HTTPS. In production, add an HSTS header and ensure redirects from HTTP to HTTPS are handled at the infrastructure layer.

**Audit logging** — Failed login attempts, signups, and logouts are not recorded. An audit log is valuable for incident response.

---

## Reporting a Vulnerability

If you find a security issue in this codebase, please open a private GitHub Security Advisory rather than a public issue. Do not include exploit details in public channels.
