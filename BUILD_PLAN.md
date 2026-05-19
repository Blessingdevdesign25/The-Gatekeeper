# Build Plan

A sequenced plan for implementing The Gatekeeper from zero to a working, production-ready authentication system. Each phase is independently shippable.

---

## Phase 0 — Scaffolding (Day 1, ~2 hours)

**Goal:** A running Next.js app with all dependencies installed and configured.

### Tasks

- [ ] `npx create-next-app@latest gatekeeper --typescript --tailwind --app --src-dir`
- [ ] Install dependencies:
  ```bash
  npm install prisma @prisma/client bcrypt iron-session zod
  npm install -D @types/bcrypt
  npx prisma init --datasource-provider sqlite
  ```
- [ ] Copy `.env.example` to `.env.local` and fill in `SESSION_SECRET` and `DATABASE_URL`
- [ ] Add `prisma/schema.prisma` with the `User` model
- [ ] Run `npx prisma generate && npx prisma db push`
- [ ] Create `src/lib/prisma.ts` (singleton Prisma client)
- [ ] Create `src/lib/session.ts` (iron-session config)
- [ ] Create `src/lib/validation.ts` (Zod schemas)
- [ ] Create `src/lib/password.ts` (bcrypt helpers)
- [ ] Verify `npm run dev` starts without errors

### Acceptance criteria

- App runs at `localhost:3000`
- `npx prisma studio` shows an empty `User` table
- TypeScript has no errors (`npm run type-check`)

---

## Phase 1 — Core API Routes (Day 1–2, ~3 hours)

**Goal:** The three auth endpoints work correctly and can be tested with curl.

### Tasks

- [ ] `POST /api/auth/signup` — validate body, hash password, create user, set session cookie
- [ ] `POST /api/auth/login` — validate body, find user, compare hash, set session cookie
- [ ] `POST /api/auth/logout` — clear session cookie
- [ ] `GET /api/user` — return current session user or 401

### Implementation notes

For signup and login, the flow is:
1. Parse request body as JSON
2. Run `signupSchema.safeParse()` — return 400 on failure with field errors
3. Check database (signup: check email isn't taken; login: find user by email)
4. bcrypt operation (signup: `hashPassword()`; login: `verifyPassword()`)
5. On success: call `session.save()` and return 201/200 with user data
6. On failure: return 409 or 401 with appropriate error code

For logout:
1. Call `session.destroy()`
2. Return 200 (always — even if no session existed)

### Acceptance criteria

- Signing up with valid data creates a row in the `User` table with a hashed password
- Logging in with correct credentials sets a cookie visible in browser DevTools
- The cookie has `HttpOnly` checked in DevTools (cannot be read by JS)
- Logging out clears the cookie
- Invalid data returns structured 400 errors with field-level messages
- Wrong password returns 401 (same message as "email not found")

---

## Phase 2 — UI: Landing Page (Day 2, ~2 hours)

**Goal:** A public landing page with Sign Up and Log In CTAs.

### Tasks

- [ ] Design decision: pick a visual direction (see `docs/ARCHITECTURE.md` aesthetic notes)
- [ ] Create `src/app/page.tsx` with hero section and two CTA buttons
- [ ] Create `src/app/layout.tsx` with root layout, Tailwind imports
- [ ] Wire buttons to `/signup` and `/login` routes (these pages don't exist yet — links work, pages 404 for now)
- [ ] Make the page responsive (mobile-first)

### Acceptance criteria

- Landing page renders at `localhost:3000`
- Sign Up button links to `/signup`
- Log In button links to `/login`
- Page looks good on mobile (375px) and desktop

---

## Phase 3 — UI: Auth Forms (Day 2–3, ~4 hours)

**Goal:** Working signup and login forms with validation feedback.

### Tasks

**Shared UI components first:**
- [ ] `src/components/ui/Input.tsx` — label, input, error message slot
- [ ] `src/components/ui/Button.tsx` — with loading state
- [ ] `src/components/ui/FormError.tsx` — top-of-form error banner

**Signup form:**
- [ ] `src/components/auth/SignupForm.tsx` — name, email, password fields
- [ ] `src/hooks/usePasswordStrength.ts` — scoring hook
- [ ] `src/components/auth/PasswordStrengthMeter.tsx` — visual bar component
- [ ] `src/app/signup/page.tsx` — page wrapper
- [ ] Wire form to `POST /api/auth/signup`
- [ ] On success: redirect to `/dashboard`
- [ ] On failure: show field-level errors from the API

**Login form:**
- [ ] `src/components/auth/LoginForm.tsx` — email, password fields
- [ ] `src/app/login/page.tsx` — page wrapper
- [ ] Wire form to `POST /api/auth/login`
- [ ] On success: redirect to `/dashboard`
- [ ] On failure: show error banner

**Password strength meter scoring:**

```
Score 0 (weak):     length < 8
Score 1 (fair):     length >= 8, only 1 character class
Score 2 (strong):   length >= 10, 2-3 character classes
Score 3 (very strong): length >= 12, all 4 character classes
                        (uppercase, lowercase, digit, symbol)
```

### Acceptance criteria

- Signup form: submitting with missing fields shows inline error messages
- Signup form: password strength meter updates live as user types
- Login form: incorrect credentials shows an error banner (not field-level, to avoid enumeration)
- Both forms show a loading state while the request is in-flight
- After successful login, browser redirects to `/dashboard`

---

## Phase 4 — Protected Dashboard (Day 3, ~2 hours)

**Goal:** A route that only logged-in users can see.

### Tasks

- [ ] `src/middleware.ts` — protect `/dashboard` with session check, redirect to `/login`
- [ ] `src/lib/auth.ts` — `getSession()` and `requireAuth()` helpers
- [ ] `src/app/dashboard/page.tsx` — server component: call `requireAuth()`, render user name + Log Out button
- [ ] Log Out button — calls `POST /api/auth/logout`, then redirects to `/`

### Implementation notes

The middleware uses `getIronSession` from `iron-session/edge` (if available) or a lightweight cookie parse to check for a valid session. If the session is missing or invalid, it redirects. The page component calls `requireAuth()` as a second check.

The Log Out button is a client component (`'use client'`) because it needs to make an API call and redirect. Everything else in the dashboard can remain a server component.

### Acceptance criteria

- Visiting `localhost:3000/dashboard` without a session redirects to `/login`
- After login, `/dashboard` shows the user's name
- Clicking Log Out clears the session and redirects to `/`
- Navigating to `/dashboard` after logout redirects to `/login` again

---

## Phase 5 — Polish and Edge Cases (Day 3–4, ~2 hours)

**Goal:** Handle all the edge cases a real user will hit.

### Tasks

- [ ] If a logged-in user visits `/login` or `/signup`, redirect them to `/dashboard`
- [ ] Handle network errors in forms (not just validation errors)
- [ ] Add `aria-` attributes to form controls for accessibility
- [ ] Add `<title>` tags and basic metadata to each page
- [ ] Test the full flow: signup → dashboard → logout → login → dashboard

### Acceptance criteria

- Logged-in user visiting `/login` is redirected to `/dashboard`
- A network failure on form submit shows a generic error message, not a crash
- All form inputs have associated labels and error messages linked via `aria-describedby`

---

## Phase 6 — CI and Documentation (Day 4, ~1 hour)

**Goal:** The project is documented and CI passes on every PR.

### Tasks

- [ ] Complete `README.md` with setup instructions
- [ ] Verify all docs in `docs/` are accurate against the implementation
- [ ] Push `.github/workflows/ci.yml` — confirm GitHub Actions passes
- [ ] Tag `v0.1.0`

---

## Dependency Map

```
Phase 0 (scaffolding)
    └── Phase 1 (API routes)
            ├── Phase 3 (auth forms) ──── Phase 4 (dashboard)
            └── Phase 2 (landing)             └── Phase 5 (polish)
                                                      └── Phase 6 (CI + docs)
```

Phases 2 and 3 can proceed in parallel once Phase 1 is done. Phase 4 requires Phase 3. Phase 5 requires all prior phases.

---

## Known Shortcuts in v0.1

These are intentional simplifications for the initial build. They are documented so future contributors know what to address:

| Shortcut | Production solution |
|----------|---------------------|
| No email verification | Send a verification link before granting access |
| No password reset | Implement time-limited reset tokens via email |
| No rate limiting on login | Add `@upstash/ratelimit` with Redis |
| No account lockout | Lock after N failed attempts |
| Session cannot be remotely invalidated | Add `sessionVersion` field to `User` |
| SQLite in dev | PostgreSQL in production (one-line schema change) |
