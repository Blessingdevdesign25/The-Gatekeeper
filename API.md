# API Reference

All API routes are under `/api/auth/`. They accept and return JSON. Authentication state is managed via an HTTP-only cookie set by the server — clients do not need to handle tokens manually.

---

## Common Conventions

**Request headers (all POST routes)**

```
Content-Type: application/json
```

**Success response shape**

```json
{
  "success": true,
  "data": { ... }
}
```

**Error response shape**

```json
{
  "success": false,
  "error": "Human-readable description",
  "code": "MACHINE_READABLE_CODE",
  "fields": { "fieldName": "error message" }
}
```

`fields` is only present on `400 Validation Failed` responses. `code` is always present on errors.

**Error codes**

| Code | Meaning |
|------|---------|
| `VALIDATION_ERROR` | One or more fields failed Zod validation |
| `EMAIL_TAKEN` | Signup attempted with an already-registered email |
| `INVALID_CREDENTIALS` | Login email not found or password incorrect |
| `UNAUTHORIZED` | Request requires authentication; no valid session found |
| `INTERNAL_ERROR` | Unexpected server error (details in server logs, not response) |

---

## POST `/api/auth/signup`

Register a new user account.

### Request body

```json
{
  "name": "Amara Okonkwo",
  "email": "amara@example.com",
  "password": "correcthorsebattery"
}
```

| Field | Type | Rules |
|-------|------|-------|
| `name` | string | Required. 1–100 characters. |
| `email` | string | Required. Must be a valid email address. Stored as lowercase. |
| `password` | string | Required. 8–128 characters. |

### Responses

**201 Created** — Account created. Session cookie set.

```json
{
  "success": true,
  "data": {
    "user": {
      "id": "cly7q2p0k0000356e7ka9bxdm",
      "name": "Amara Okonkwo",
      "email": "amara@example.com"
    }
  }
}
```

**400 Validation Failed**

```json
{
  "success": false,
  "error": "Validation failed",
  "code": "VALIDATION_ERROR",
  "fields": {
    "email": "Invalid email address",
    "password": "Password must be at least 8 characters"
  }
}
```

**409 Conflict** — Email already registered.

```json
{
  "success": false,
  "error": "An account with this email already exists",
  "code": "EMAIL_TAKEN"
}
```

**500 Internal Server Error**

```json
{
  "success": false,
  "error": "Something went wrong. Please try again.",
  "code": "INTERNAL_ERROR"
}
```

### Side effects

- Password is hashed with bcrypt (cost factor 12) before being written to the database.
- A session cookie (`gatekeeper-session`) is set with `HttpOnly; Secure; SameSite=Strict`.
- The plain-text password is never logged or stored.

---

## POST `/api/auth/login`

Authenticate an existing user.

### Request body

```json
{
  "email": "amara@example.com",
  "password": "correcthorsebattery"
}
```

| Field | Type | Rules |
|-------|------|-------|
| `email` | string | Required. Valid email. |
| `password` | string | Required. |

### Responses

**200 OK** — Credentials valid. Session cookie set.

```json
{
  "success": true,
  "data": {
    "user": {
      "id": "cly7q2p0k0000356e7ka9bxdm",
      "name": "Amara Okonkwo",
      "email": "amara@example.com"
    }
  }
}
```

**400 Validation Failed** — See signup 400 example above.

**401 Unauthorized** — Email not found or password incorrect. The same error is returned for both cases to prevent user enumeration.

```json
{
  "success": false,
  "error": "Invalid email or password",
  "code": "INVALID_CREDENTIALS"
}
```

### Security notes

- Both "email not found" and "incorrect password" return identical `401` responses and take a similar amount of time. This prevents an attacker from determining whether a given email is registered by observing the response.
- `bcrypt.compare` is used for the hash comparison — it is timing-safe.

---

## POST `/api/auth/logout`

Destroy the current session.

### Request body

None required. The session is identified by the cookie automatically.

### Responses

**200 OK** — Session cookie cleared.

```json
{
  "success": true
}
```

This route always returns 200, even if no session existed. Idempotent by design.

### Side effects

- The `gatekeeper-session` cookie is overwritten with an empty, immediately-expired value.
- The server does not maintain a blocklist — the session is stateless. The cookie being gone is the only enforcement.

---

## GET `/api/user`

Return the currently authenticated user's data. Used by the dashboard page.

### Request

No body. Cookie sent automatically by the browser.

### Responses

**200 OK**

```json
{
  "success": true,
  "data": {
    "user": {
      "id": "cly7q2p0k0000356e7ka9bxdm",
      "name": "Amara Okonkwo",
      "email": "amara@example.com"
    }
  }
}
```

**401 Unauthorized** — No valid session cookie.

```json
{
  "success": false,
  "error": "Not authenticated",
  "code": "UNAUTHORIZED"
}
```

---

## Cookie Reference

| Attribute | Value | Reason |
|-----------|-------|--------|
| Name | `gatekeeper-session` | Configurable in `src/lib/session.ts` |
| `HttpOnly` | true | JavaScript cannot read the token |
| `Secure` | true | HTTPS-only in production |
| `SameSite` | `Strict` | CSRF mitigation |
| `Max-Age` | `604800` (7 days) | Users stay logged in for a week |
| `Path` | `/` | Cookie sent with all requests |

---

## Testing the API

With curl:

```bash
# Sign up
curl -c cookies.txt -X POST http://localhost:3000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"name":"Test User","email":"test@example.com","password":"hunter2abc"}'

# Log in
curl -c cookies.txt -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"hunter2abc"}'

# Get current user (uses saved cookies)
curl -b cookies.txt http://localhost:3000/api/user

# Log out
curl -b cookies.txt -c cookies.txt -X POST http://localhost:3000/api/auth/logout
```
