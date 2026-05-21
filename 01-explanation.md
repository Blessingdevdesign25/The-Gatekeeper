# The Gatekeeper: How the Magic Castle Works 🏰

Hello there! Welcome to the secret blueprint of **The Gatekeeper**. 
Imagine we are building a grand, super-secure magic castle. Inside the castle, there is a special room called the **Dashboard** where only members are allowed. 

Let's walk through exactly how we build the gates, check the members, and keep the bad guys out—using simple toys, magic blenders, and castle guards!

---

## 🗝️ Part 1: The Magic Blender (Password Hashing & Verification)
*File: [src/lib/password.ts](file:///c:/Users/BLESSING%20ALEONOMOH/Desktop/The%20Gatekeeper/src/lib/password.ts)*

When you sign up, you choose a secret password. But if we write down your password in our notebook (the database), a sneaky thief might steal the notebook and read it! 
So, we use a **Magic Blender** called `bcrypt` to hide it.

### How we mix it up (`hashPassword`):
Imagine a magic blender. 
1. You put your real password (like `"strawberry123"`) inside it.
2. The blender spins around **12 times** (this is the cost factor!). It takes about a quarter of a second, which is super fast for humans but painfully slow for bad computers trying to guess it.
3. Out comes a wild, unrecognizable green mush that looks like this: `$2b$12$R9Z...`. 
4. The cool thing about this magic blender is that **you can never un-blend the mush** back into a strawberry! It is a one-way street. 

So, in our database, we only store the **green mush**, never your actual password.

### How we check it (`verifyPassword`):
When you try to log in:
1. You type `"strawberry123"` again.
2. The guard doesn't know if that's right because he only has the green mush `$2b$12$R9Z...` in his notebook.
3. So he puts your typed word into the **Magic Blender** again.
4. If it makes the exact same green mush, the guard says: *"Aha! You typed the correct password!"* and lets you in. If the mush is different, he kicks you out!

---

## 🎟️ Part 2: The Magic Wristband (Session Cookies)
*Files: [src/lib/session.ts](file:///c:/Users/BLESSING%20ALEONOMOH/Desktop/The%20Gatekeeper/src/lib/session.ts) and [src/lib/auth.ts](file:///c:/Users/BLESSING%20ALEONOMOH/Desktop/The%20Gatekeeper/src/lib/auth.ts)*

Once you prove who you are, the castle King doesn't want to ask for your password every time you click a button or walk to a different room. That would be super annoying!
Instead, he gives you a **Magic Wristband** (called a **Session Cookie**).

### Creating the Wristband:
When you log in successfully, we create a little letter containing your secret ID, your name, and email:
```json
{
  "userId": "user_123",
  "name": "Alex",
  "email": "alex@castle.com",
  "isLoggedIn": true
}
```
But wait! If we just hand you this plain paper letter, you could easily grab a crayon, erase your name, write "The King", and sneak into the throne room! 

To stop this, we use a magic spell from a library called `iron-session`. We take your letter, lock it inside a **mystical indestructible box** (our encrypted cookie), and wrap it with a special secret password (`SESSION_SECRET`) that only the King knows. 

We hand this locked box to your web browser. Your browser puts it on your wrist.

### Reading the Wristband on Every Request:
Whenever your browser asks the server for a new page (like a picture or a document), it automatically holds up the wristband box.
The server:
1. Grabs the box.
2. Uses its secret key (`SESSION_SECRET`) to unlock it.
3. If it opens, the King knows: *"Yes! I made this box, and nobody has opened or altered it. Welcome back, Alex!"*
4. If it doesn't open (or looks tampered with), the King throws it away!

---

## 💂 Part 3: The Castle Guard (Protected Routes)
*Files: [src/proxy.ts](file:///c:/Users/BLESSING%20ALEONOMOH/Desktop/The%20Gatekeeper/src/proxy.ts) and [src/app/dashboard/page.tsx](file:///c:/Users/BLESSING%20ALEONOMOH/Desktop/The%20Gatekeeper/src/app/dashboard/page.tsx)*

We have a special room called the `/dashboard`. How do we make sure strangers can't get in? We place a **Castle Guard** at the entrance!

### The Front Gate Guard (`proxy.ts` / Middleware):
In Next.js, this file acts like a guard standing at the bridge of the `/dashboard` folder path. 

```typescript
export default async function proxy(request: NextRequest) {
  const response = NextResponse.next();

  // 1. The guard grabs your wristband box
  const session = await getIronSession<SessionData>(request, response, sessionOptions);

  // 2. The guard looks inside. Are you logged in?
  if (!session.isLoggedIn) {
    // 3. NO WRISTBAND! The guard turns you around and sends you back to the /login page
    const loginUrl = new URL('/login', request.url);
    return NextResponse.redirect(loginUrl);
  }

  // 4. YES! You have a valid wristband. Walk right in!
  return response;
}
```

### The Room Guard (`requireAuth` inside `dashboard/page.tsx`):
Even if you somehow sneak past the bridge, the Dashboard room itself has an inner guard check! 

Inside `src/app/dashboard/page.tsx`, we run:
```typescript
const session = await requireAuth();
```
This double-checks the wristband inside the server room. If it's all good, it prints your name on the dashboard wall: *"Welcome, Alex!"* and gives you a big red **Log Out** button which snaps your wristband off and destroys it.

---

## 🗺️ Line-by-Line Code Adventure

Let's look at the actual code scripts line-by-line:

### 1. The Secrets Blender Script (`src/lib/password.ts`)

```typescript
import bcrypt from 'bcrypt'; // We bring in the magic blender machine!

const COST_FACTOR = 12; // How many times we spin the blender (12 spins make it super strong!)

// This function blends a password into green mush
export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, COST_FACTOR); // Spin the password and return the green mush!
}

// This function checks if a typed password matches the green mush
export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash); // Blend the typed password and see if it makes the same mush!
}
```

---

### 2. The Wristband Rulebook (`src/lib/session.ts`)

```typescript
import { SessionOptions } from 'iron-session';
import { SessionData } from '@/types';

// The King needs a secret key to lock the boxes. If he doesn't have one, he panics!
if (!process.env.SESSION_SECRET) {
  throw new Error('SESSION_SECRET environment variable is not set. See .env.example');
}

// These are the rules for how the wristband is made
export const sessionOptions: SessionOptions = {
  password: process.env.SESSION_SECRET, // Use the King's secret key to lock/unlock it
  cookieName: 'gatekeeper-session', // The name tag written on the wristband
  cookieOptions: {
    secure: process.env.NODE_ENV === 'production', // Only send via secure carrier birds (HTTPS) in the real world
    httpOnly: true, // Hide the contents so sneaky browser scripts can't steal it
    sameSite: 'strict', // Only show the wristband to our castle, never other castles
    maxAge: 60 * 60 * 24 * 7, // The wristband self-destructs after 7 days (in seconds)
  },
};
```

---

### 3. The Castle Guard Interceptor (`src/proxy.ts`)

```typescript
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getIronSession } from 'iron-session';
import { sessionOptions } from '@/lib/session';
import { SessionData } from '@/types';

// This function runs automatically whenever someone tries to walk into a folder
export default async function proxy(request: NextRequest) {
  const response = NextResponse.next();

  // Try to open the wristband box carried by the request
  const session = await getIronSession<SessionData>(request, response, sessionOptions);

  // If there's no wristband, or they aren't logged in...
  if (!session.isLoggedIn) {
    // Remember where they wanted to go, and push them to the /login page
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('callbackUrl', request.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  // They are cool! Let them pass
  return response;
}

// Tell Next.js only to guard the '/dashboard' route and its child rooms!
export const config = {
  matcher: ['/dashboard/:path*'],
};
```

---

### 4. The Member-Only Room (`src/app/dashboard/page.tsx`)

```typescript
import { requireAuth } from '@/lib/auth';
import { LogoutButton } from './LogoutButton';

// This is the private Member-Only room page!
export default async function DashboardPage() {
  // Check the wristband. If they don't have one, this helper automatically redirects them to /login
  const session = await requireAuth();

  return (
    <main className="flex flex-1 flex-col items-center justify-center p-6 text-center">
      <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 w-full max-w-2xl">
        <div className="rounded-3xl border border-white/10 bg-slate-900/50 p-12 shadow-2xl backdrop-blur-xl">
          
          {/* A big green checkmark! */}
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-green-400 to-emerald-600 shadow-lg mb-8">
            <svg className="h-10 w-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          
          {/* Say hello using the name written inside the magic wristband box! */}
          <h1 className="text-4xl font-bold tracking-tight text-white mb-2">
            Welcome, <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-500">{session.name}</span>
          </h1>
          <p className="text-lg text-slate-400 mb-10">
            You have successfully bypassed The Gatekeeper.
          </p>
          
          {/* The Log Out button to remove the wristband */}
          <div className="flex justify-center">
            <LogoutButton />
          </div>
        </div>
      </div>
    </main>
  );
}
```

---

And that is how the magic castle keeps everything safe! 🏰✨ 
Every door has a guard, every visitor has a locked wristband box, and every password is spun into safe green mush. No thieves allowed!
