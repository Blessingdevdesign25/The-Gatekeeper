# The Gatekeeper: Lie Detector — Auth Flow Statements

Five statements about how the authentication flow works. Four are true, one is false.

---

## The Statements

### Statement A
The password hashing function `hashPassword` uses a bcrypt cost factor of 12, making each hash take approximately 250–400ms on modern hardware.

### Statement B
The User model in the Prisma schema includes an `emailVerified` field to track email confirmation status.

### Statement C
The login route returns a generic `"Invalid email or password"` error regardless of whether the email exists or the password is wrong, preventing user enumeration through error messages on that specific endpoint.

### Statement D
The session cookie is configured with `httpOnly: true` and `sameSite: 'strict'`, preventing JavaScript access to the cookie and providing CSRF protection respectively.

### Statement E
The middleware proxy only protects the `/dashboard` route and its children, leaving API routes such as login and signup unprotected by the middleware guard.

---

## Investigation

### Verifying Statement A

**Source:** `src/lib/password.ts`

```typescript
const COST_FACTOR = 12;

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, COST_FACTOR);
}
```

The cost factor is explicitly set to 12. The comment on line 3–4 states: *"Cost factor 12: ~250-400ms per hash on modern hardware."*

**Verdict:** TRUE.

---

### Verifying Statement B

**Source:** `prisma/schema.prisma`

```prisma
model User {
  id        String   @id @default(cuid())
  name      String
  email     String   @unique
  password  String   // bcrypt hash — never the plain-text password
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([email])
}
```

The model has six fields: `id`, `name`, `email`, `password`, `createdAt`, `updatedAt`. There is no `emailVerified` field, no `emailVerificationToken` field, and no mechanism whatsoever for tracking email confirmation. A user can sign up with any email address and immediately access the dashboard without verifying ownership.

**Verdict:** FALSE — This field does not exist in the schema.

---

### Verifying Statement C

**Source:** `src/app/api/auth/login/route.ts`

```typescript
if (!user || !(await verifyPassword(password, user.password))) {
  return NextResponse.json(
    { success: false, error: 'Invalid email or password', code: 'INVALID_CREDENTIALS' },
    { status: 401 }
  );
}
```

The exact same error message is returned for both branches of the conditional: user does not exist (`!user`) OR password does not match (`!(await verifyPassword(...))`). The response body, status code, and error code are identical in both cases. The attacker cannot distinguish between "wrong email" and "wrong password" from the response content on this endpoint.

**Note:** This statement is scoped to the *login endpoint specifically*. A separate endpoint (`/api/auth/signup`) does leak email existence through its `EMAIL_IN_USE` error code, but that is a different vector — Statement C is about the login route's error behavior, which is genuinely generic.

**Verdict:** TRUE.

---

### Verifying Statement D

**Source:** `src/lib/session.ts`

```typescript
cookieOptions: {
  secure: process.env.NODE_ENV === 'production',
  httpOnly: true,
  sameSite: 'strict',
  maxAge: 60 * 60 * 24 * 7,
},
```

Both `httpOnly: true` and `sameSite: 'strict'` are present. `httpOnly` prevents client-side JavaScript from reading the cookie via `document.cookie`. `sameSite: 'strict'` prevents the browser from sending the cookie on cross-site requests, mitigating CSRF attacks.

**Verdict:** TRUE.

---

### Verifying Statement E

**Source:** `src/proxy.ts`

```typescript
export const config = {
  matcher: ['/dashboard/:path*'],
};
```

The matcher explicitly limits middleware execution to paths starting with `/dashboard/`. API routes (`/api/auth/login`, `/api/auth/signup`, `/api/auth/logout`, `/api/user`) are not matched and therefore bypass the middleware entirely. The middleware's session check (`if (!session.isLoggedIn)`) and any future CSRF or rate-limiting logic added to this file would never run for API requests.

**Verdict:** TRUE.

---

## Summary

| Statement | Verdict |
|-----------|---------|
| A — bcrypt cost factor 12 | TRUE |
| **B — emailVerified field exists** | **FALSE** |
| C — Generic login error message | TRUE |
| D — httpOnly and sameSite flags | TRUE |
| E — Middleware only protects /dashboard | TRUE |

---

## The Lie Revealed

**Statement B is the lie.**

The Prisma `User` model has no `emailVerified` field. The schema contains only `id`, `name`, `email`, `password`, `createdAt`, and `updatedAt`. There is no email verification flow anywhere in the codebase — users can register with any email and immediately access the dashboard without confirming ownership.

This is a genuine missing feature (noted in the cross-check audit at `docs/04-cross-check.md`), which makes the lie plausible: a security-conscious auth system *should* have email verification, but this one does not.

---

*Lie detector administered May 2026.*
