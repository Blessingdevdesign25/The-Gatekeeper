# Deployment Guide

This guide covers deploying The Gatekeeper to production. The two most important differences from local development are using a real database and serving over HTTPS.

---

## Pre-Deployment Checklist

- [ ] `SESSION_SECRET` is a fresh 32+ character random string, not the dev value
- [ ] `DATABASE_URL` points to a production PostgreSQL instance
- [ ] HTTPS is enabled on your domain
- [ ] `.env.local` is in `.gitignore` and not committed
- [ ] `NODE_ENV` will be `production` at runtime

---

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `SESSION_SECRET` | Yes | AES key for iron-session. Min 32 chars. |
| `DATABASE_URL` | Yes | PostgreSQL connection string (production) |
| `NODE_ENV` | Auto | Set to `production` by most hosts automatically |
| `NEXTAUTH_URL` | No | Only if you add NextAuth later |

Generate a secure secret:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

## Switching from SQLite to PostgreSQL

1. Update `prisma/schema.prisma`:

```prisma
datasource db {
  provider = "postgresql"    // was "sqlite"
  url      = env("DATABASE_URL")
}
```

2. Set `DATABASE_URL` to your PostgreSQL connection string:

```bash
DATABASE_URL="postgresql://user:password@host:5432/gatekeeper?sslmode=require"
```

3. Run migrations on the production database:

```bash
npx prisma migrate deploy
```

(Use `migrate deploy` in CI/production — not `db push`, which is for development only.)

---

## Vercel

The fastest path for Next.js applications.

```bash
npm i -g vercel
vercel --prod
```

In the Vercel dashboard, add environment variables under **Project → Settings → Environment Variables**:

- `SESSION_SECRET`
- `DATABASE_URL`

Vercel sets `NODE_ENV=production` automatically. HTTPS is provided by default.

**Database recommendation:** Vercel Postgres (managed PostgreSQL, one-click setup inside Vercel dashboard) or Neon (serverless PostgreSQL with a free tier).

---

## Fly.io

Good for applications that need persistent compute or more control.

```bash
npm i -g flyctl
fly auth login
fly launch          # Creates fly.toml and provisions an app
fly secrets set SESSION_SECRET="your-secret-here"
fly secrets set DATABASE_URL="postgresql://..."
fly deploy
```

HTTPS is automatic via Let's Encrypt on Fly.io.

**Database recommendation:** Fly Postgres (runs alongside your app) or Neon.

---

## Railway

A simple, developer-friendly host with built-in PostgreSQL.

1. Connect your GitHub repository in the Railway dashboard.
2. Add a PostgreSQL database plugin.
3. Railway automatically sets `DATABASE_URL` in your app's environment.
4. Add `SESSION_SECRET` in the Railway environment variables panel.
5. Deploy.

---

## Docker (Self-Hosted)

```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npx prisma generate
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV production
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/prisma ./prisma

EXPOSE 3000
CMD ["npm", "start"]
```

Run with:

```bash
docker build -t gatekeeper .
docker run -p 3000:3000 \
  -e SESSION_SECRET="your-secret" \
  -e DATABASE_URL="postgresql://..." \
  gatekeeper
```

Place behind an nginx or Caddy reverse proxy to handle TLS. Caddy is recommended — it auto-provisions Let's Encrypt certificates:

```caddyfile
yourdomain.com {
  reverse_proxy localhost:3000
}
```

---

## Running Database Migrations in CI

Add this step before your deployment step:

```yaml
- name: Run database migrations
  run: npx prisma migrate deploy
  env:
    DATABASE_URL: ${{ secrets.DATABASE_URL }}
```

Never run `prisma db push` in production — it can cause data loss. `migrate deploy` only applies pending, version-controlled migrations.

---

## Health Check

The application does not expose a `/health` endpoint by default. For production monitoring, add one:

```typescript
// src/app/api/health/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json({ status: 'ok', db: 'connected' });
  } catch {
    return NextResponse.json({ status: 'error', db: 'disconnected' }, { status: 503 });
  }
}
```

Point your uptime monitor (UptimeRobot, Betterstack, etc.) at `/api/health`.

---

## Security Hardening for Production

Beyond the defaults in this project, consider adding:

**HTTP Security Headers** — In `next.config.ts`:

```typescript
const securityHeaders = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  {
    key: 'Content-Security-Policy',
    value: "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'",
  },
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
];

export default {
  headers: async () => [
    { source: '/(.*)', headers: securityHeaders },
  ],
};
```

**Rate Limiting** — Wrap `/api/auth/login` with `@upstash/ratelimit` to slow credential stuffing attacks.

**Error Monitoring** — Add Sentry or a similar service. Authentication errors are high-signal for security incidents.

---

## Rollback

If a deployment causes issues:

- **Vercel / Railway / Fly.io** — use the platform's rollback UI to revert to the previous deployment in one click.
- **Database migrations** — if a migration needs to be reverted, use `prisma migrate resolve --rolled-back <migration-name>` and apply a corrective migration. Never manually edit the migration history in production.
