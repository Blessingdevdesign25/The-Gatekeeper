# The Gatekeeper: Core Authentication Principles

This document identifies and defines the core security and authentication principles implemented inside **The Gatekeeper**, maps them to their plain definitions, and references the exact code implementations showcasing these principles.

---

## 1. Never Store Plaintext Passwords
### 💡 Definition
Plaintext passwords should never be written to a database or logs. If an attacker breaches the database, raw passwords would immediately compromise every user account. Instead, we compute a mathematical one-way cryptographic hash of the password using a slow hashing algorithm like `bcrypt`, storing only the hash.

### 🔍 Exact Code Demonstration
* **File:** [`src/lib/password.ts` (Lines 8-10)](file:///c:/Users/BLESSING%20ALEONOMOH/Desktop/The%20Gatekeeper/src/lib/password.ts#L8-L10)
  We use the `hash` method from `bcrypt` with a cost factor of `12` to hash the plaintext password:
  ```typescript
  export async function hashPassword(plain: string): Promise<string> {
    return bcrypt.hash(plain, COST_FACTOR);
  }
  ```

* **File:** [`src/app/api/auth/signup/route.ts` (Lines 25-32)](file:///c:/Users/BLESSING%20ALEONOMOH/Desktop/The%20Gatekeeper/src/app/api/auth/signup/route.ts#L25-L32)
  During registration, we instantly hash the incoming plaintext password and save only the `hashedPassword` to Prisma:
  ```typescript
  const { name, email, password } = result.data;
  const hashedPassword = await hashPassword(password);

  try {
    const user = await prisma.user.create({
      data: { name, email, password: hashedPassword },
    });
  ```

---

## 2. Server-Side Validation
### 💡 Definition
Client-side validation is a user-experience enhancer (fast visual feedback), but it can be completely bypassed by an attacker using tools like `curl`, Postman, or by disabling JavaScript in the browser. Therefore, the server must **always** enforce strict data schema validation before processing, querying, or storing any incoming payload.

### 🔍 Exact Code Demonstration
* **File:** [`src/app/api/auth/signup/route.ts` (Lines 10-23)](file:///c:/Users/BLESSING%20ALEONOMOH/Desktop/The%20Gatekeeper/src/app/api/auth/signup/route.ts#L10-L23)
  We parse and validate the request body against our `signupSchema` before executing any database or hashing logic:
  ```typescript
  const body = await req.json();
  const result = signupSchema.safeParse(body);

  if (!result.success) {
    const fields: Record<string, string> = {};
    result.error.issues.forEach((issue) => {
      if (issue.path[0]) fields[issue.path[0].toString()] = issue.message;
    });

    return NextResponse.json(
      { success: false, error: 'Validation failed', code: 'VALIDATION_ERROR', fields },
      { status: 400 }
    );
  }
  ```

---

## 3. Defense in Depth
### 💡 Definition
Rather than relying on a single security mechanism (e.g. just a middleware or just a database query check), we deploy multiple independent layers of security controls. If one layer fails or is bypassed due to a configuration mistake, subsequent layers are in place to block the intrusion.

### 🔍 Exact Code Demonstration
We employ a three-tier defense checking pipeline:
* **Layer 1: Routing Interception Gate (Proxy/Middleware)**  
  * **File:** [`src/proxy.ts` (Lines 12-17)](file:///c:/Users/BLESSING%20ALEONOMOH/Desktop/The%20Gatekeeper/src/proxy.ts#L12-L17)  
    Intercepts and blocks requests at the Edge before Next.js even mounts or executes server/client components for `/dashboard`:
    ```typescript
    if (!session.isLoggedIn) {
      // Preserve the intended destination so we can redirect back after login
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('callbackUrl', request.nextUrl.pathname);
      return NextResponse.redirect(loginUrl);
    }
    ```

* **Layer 2: Server-Side Page Integrity Check**  
  * **File:** [`src/app/dashboard/page.tsx` (Line 4)](file:///c:/Users/BLESSING%20ALEONOMOH/Desktop/The%20Gatekeeper/src/app/dashboard/page.tsx#L4)  
    Even if the middleware fails to intercept or gets skipped, the React Server Component immediately runs its own validation check via `requireAuth()` before rendering:
    ```typescript
    const session = await requireAuth();
    ```

* **Layer 3: Authentication Helper Guard**  
  * **File:** [`src/lib/auth.ts` (Lines 16-21)](file:///c:/Users/BLESSING%20ALEONOMOH/Desktop/The%20Gatekeeper/src/lib/auth.ts#L16-L21)  
    Guarantees that a user is fully authenticated at the controller level; otherwise, throws an immediate redirection:
    ```typescript
    export async function requireAuth(): Promise<SessionData> {
      const session = await getSession();

      if (!session.isLoggedIn || !session.userId) {
        redirect('/login');
      }
    ```

---

## 4. Least Privilege
### 💡 Definition
System components, processes, and users should only have access to the absolute minimum information and resources necessary to accomplish their specific task. This limits the damage if a specific route, database row, or session token is compromised.

### 🔍 Exact Code Demonstration
* **File:** [`src/app/api/user/route.ts` (Lines 18-22)](file:///c:/Users/BLESSING%20ALEONOMOH/Desktop/The%20Gatekeeper/src/app/api/user/route.ts#L18-L22)
  When the client requests user details, we selectively retrieve and return only public details (`id`, `name`, `email`). We explicitly exclude the sensitive hashed password field from database response payload:
  ```typescript
  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { id: true, name: true, email: true },
  });
  ```

* **File:** [`src/app/api/auth/login/route.ts` (Lines 23-28)](file:///c:/Users/BLESSING%20ALEONOMOH/Desktop/The%20Gatekeeper/src/app/api/auth/login/route.ts#L23-L28)
  To prevent "User Enumeration" (allowing hackers to guess which emails exist on our platform), we provide a generic error message. We reveal the absolute minimum feedback about why authentication failed:
  ```typescript
  if (!user || !(await verifyPassword(password, user.password))) {
    return NextResponse.json(
      { success: false, error: 'Invalid email or password', code: 'INVALID_CREDENTIALS' },
      { status: 401 }
    );
  }
  ```

---

## 5. Secure Defaults
### 💡 Definition
The application should be configured to be secure by default. Developers or end-users shouldn't need to turn on security settings manually. Unsecured modes or parameters must require explicit opt-out rather than secure states requiring explicit opt-in.

### 🔍 Exact Code Demonstration
* **File:** [`src/lib/session.ts` (Lines 11-18)](file:///c:/Users/BLESSING%20ALEONOMOH/Desktop/The%20Gatekeeper/src/lib/session.ts#L11-L18)
  Our cookie rules enforce high security out of the box:
  ```typescript
  cookieOptions: {
    // In production (HTTPS), the Secure flag is mandatory.
    // In development (HTTP on localhost), set it to false.
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true, // Secure Default: prevents browser scripts from stealing the session token
    sameSite: 'strict', // Secure Default: shields against CSRF (Cross-Site Request Forgery) attacks
    maxAge: 60 * 60 * 24 * 7, // 7 days in seconds
  },
  ```
