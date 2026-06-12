# Phase 2: Authentication + User Profile - Research

**Researched:** 2026-06-12
**Domain:** Auth.js v5 (NextAuth) + NestJS JWT validation + email flows + avatar upload
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** Full email verification lock — unverified users redirected to "verify your email" page after signup; cannot access dashboard or content until link is clicked.
- **D-02:** Resend button on verify-email page: 1 resend per 60 seconds, max 3 per hour, enforced server-side in Redis.
- **D-03:** Verification token validity: **24 hours**. Expired tokens show error with "request new link" option.
- **D-04:** Email service: **Resend** (resend.com). `RESEND_API_KEY` env var.
- **D-05:** Avatar mechanism: **file upload to MinIO/R2 via presigned URL** (not URL paste).
- **D-06:** Upload flow: client → NestJS `POST /api/profile/avatar/upload-url` → presigned PUT URL → browser uploads directly to MinIO → `PATCH /api/users/me` with storage key.
- **D-07:** Default avatar: **generated initials avatar** using first letter + deterministic color from hash of user name. SVG or client-rendered.
- **D-08:** Upload constraints: **2 MB max, JPEG/PNG/WebP only**, enforced at presigned-URL generation step. 400 error on violation before any URL is issued.
- **D-09:** Google OAuth email collision: **auto-link** to existing account via `allowDangerousEmailAccountLinking: true` on PrismaAdapter.
- **D-10:** Google OAuth users **skip email verification**. `emailVerified` set to `new Date()` on account creation.
- **D-11:** Google OAuth users have no password in v1. Adding a password later is deferred.
- **D-12:** NestJS validates auth via **shared JWT secret pattern**: same secret used by NextAuth, verified by `@nestjs/passport` + `passport-jwt` (see critical note in Architecture Patterns below).
- **D-13:** JWT payload: `userId`, `role` (UserRole: STUDENT/ADMIN), `cefrLevel` (CefrLevel: B1/B2/C1).
- **D-14:** Session duration: **30 days** (`maxAge: 30 * 24 * 60 * 60`).
- **D-15:** Responsibility split — NextAuth owns signup/signin/signout/email-verification/password-reset; NestJS owns `GET /api/users/me`, `PATCH /api/users/me`, `POST /api/profile/avatar/upload-url`.

### Claude's Discretion
- Password reset token storage mechanism (database table vs. encrypted token in URL)
- Specific NestJS module structure for auth (AuthModule, UsersModule, ProfileModule)
- NextAuth route handler file location (`app/api/auth/[...nextauth]/route.ts`)
- Profile page URL (`/profile` or `/settings/profile`)
- CEFR level display format (badge, text label, or progress bar)

### Deferred Ideas (OUT OF SCOPE)
- Password for Google OAuth users (enable email login as secondary method)
- MFA / two-factor authentication
- Account deletion / GDPR export
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| AUTH-01 | User can register with email and password | NextAuth Credentials provider + bcrypt + PrismaAdapter |
| AUTH-02 | User receives email verification link after signup; must verify before accessing content | Auth.js signIn callback gates on `emailVerified`; Resend SDK sends email; Redis rate-limiting for resend |
| AUTH-03 | User can sign in with Google OAuth | NextAuth Google provider + PrismaAdapter auto-links accounts (D-09) |
| AUTH-04 | User can request a password reset link sent to email | Custom password reset flow: Resend SDK + token stored in `VerificationToken` table or signed URL |
| AUTH-05 | User session persists across browser refresh and tab close/reopen | NextAuth JWT strategy with 30-day `maxAge` (D-14) |
| AUTH-06 | User is redirected to login when accessing protected routes while unauthenticated | NextAuth middleware/proxy + `authorized` callback |
| PROF-01 | User has a profile storing name, email, avatar URL, CEFR level, XP total, registration date, last activity | `User` model already exists in schema (Phase 1); NestJS `GET /api/users/me` returns these fields |
| PROF-02 | User can update display name and avatar | `PATCH /api/users/me` + presigned URL avatar upload flow (D-06) |
| PROF-03 | User's current CEFR level displayed throughout the app; updates based on XP thresholds | CEFR badge component reads from JWT payload (`cefrLevel` field in D-13) |
</phase_requirements>

---

## Summary

Phase 2 builds the identity layer that every subsequent phase depends on. The implementation spans two apps: **Next.js (apps/web)** owns the auth UX, NextAuth configuration, email sending, and session management; **NestJS (apps/api)** owns profile data endpoints protected by a JWT guard.

The most important architectural finding is that **Auth.js v5 issues JWE (encrypted JWT) tokens, not plain JWTs**. Standard `passport-jwt` with `jsonwebtoken.verify()` cannot decode them. NestJS must use `decode()` from `@auth/core/jwt` with the correct salt to decrypt the session token. This is a known integration challenge documented across several community discussions and the official Auth.js JWT reference.

Password reset cannot use NextAuth's built-in Email provider (which requires a nodemailer-compatible SMTP/sending adapter). The correct pattern is a custom flow: generate a time-limited token, store in Prisma's `VerificationToken` table, send the link via Resend SDK, and validate on click.

**Primary recommendation:** Implement the NestJS JwtAuthGuard using `@auth/core/jwt` decode (not passport-jwt's verify), send all transactional emails via the `resend` npm package, and use `boring-avatars` for default initials avatars.

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| User registration (email/password) | Frontend Server (Next.js/NextAuth) | Database (Prisma) | NextAuth Credentials provider handles sign-up; PrismaAdapter persists user |
| Google OAuth sign-in | Frontend Server (Next.js/NextAuth) | Database (Prisma) | NextAuth Google provider owns the OAuth dance; adapter auto-links accounts |
| Email verification gate | Frontend Server (Next.js/NextAuth) | API backend (NestJS) | signIn callback checks `emailVerified`; Redis rate-limiter lives in NestJS (or Next.js API route); Resend SDK in whichever process sends email |
| Password reset flow | Frontend Server (Next.js/NextAuth) | Database (Prisma) | Custom route handlers in apps/web; VerificationToken table for token storage |
| Session persistence / JWT issuing | Frontend Server (Next.js/NextAuth) | — | NextAuth JWT strategy, 30-day maxAge, set in auth.ts |
| Protected route redirection | Frontend Server (Next.js middleware) | — | NextAuth `authorized` callback in middleware/proxy intercepts unauthenticated requests |
| User profile data (read/write) | API Backend (NestJS) | Database (Prisma) | `GET /PATCH /api/users/me` endpoints behind JwtAuthGuard |
| Avatar presigned URL generation | API Backend (NestJS) | Storage (MinIO/R2) | NestJS validates constraints and generates S3 presigned PUT URL |
| Default avatar rendering | Browser / Client | — | boring-avatars SVG rendered client-side from user name |
| CEFR level display | Browser / Client | — | Badge component reads `cefrLevel` from session/JWT payload |
| JWT validation (NestJS) | API Backend (NestJS) | — | Custom JwtAuthGuard using `@auth/core/jwt` decode |
| Transactional email sending | Frontend Server (Next.js) | — | Resend SDK in Next.js server actions or API route handlers |

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `next-auth` | 5.0.0-beta.31 [VERIFIED: npm registry] | Auth flows, session management, OAuth | Project constraint; v5 is App Router native; PrismaAdapter included |
| `@auth/prisma-adapter` | 2.11.2 [VERIFIED: npm registry] | Persists NextAuth sessions/accounts to Prisma | Official Auth.js adapter for Prisma; compatible with Prisma 6.x |
| `@auth/core` | 0.34.3 [VERIFIED: npm registry] | Provides `decode()` for JWE token decryption in NestJS | Required for NestJS guard to decrypt Auth.js v5 JWE tokens |
| `@nestjs/passport` | 11.0.5 [VERIFIED: npm registry] | NestJS passport integration | Official NestJS module; version matches NestJS 11 core |
| `passport-jwt` | 4.0.1 [VERIFIED: npm registry] | JWT Bearer token extraction | Used for extracting token from Authorization header; verify step replaced by `@auth/core/jwt` decode |
| `@types/passport-jwt` | (devDep) | TypeScript types | Needed for TS compilation |
| `resend` | 6.12.4 [VERIFIED: npm registry] | Transactional email (verification, password reset) | D-04 decision; HTTP API, no SMTP config, free tier 3k/month |
| `bcrypt` | 5.x [ASSUMED] | Password hashing (12 rounds) | Project CLAUDE.md specifies bcrypt 5.x; already listed as standard |
| `@types/bcrypt` | (devDep) | TypeScript types | — |
| `boring-avatars` | 2.0.4 [VERIFIED: npm registry] | Deterministic SVG initials avatars | D-07 decision; zero dependencies, deterministic output, OSS |
| `@aws-sdk/client-s3` | 3.1067.0 [VERIFIED: npm registry] | S3-compatible storage client | Already in project CLAUDE.md stack; works against MinIO and R2 |
| `@aws-sdk/s3-request-presigner` | 3.1067.0 [VERIFIED: npm registry] | Generate presigned PUT URLs | Companion to client-s3; same version train |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `ioredis` | 5.11.1 [VERIFIED: npm registry] | Redis client for rate-limit counters | Email resend rate-limiting (1/60s, max 3/hr) |
| `@nestjs/jwt` | (check version) | NestJS JWT module | Only needed if you want JwtModule for token signing — NOT needed if using @auth/core decode |
| `zod` | 3.x [VERIFIED: npm registry] | DTO validation in shared package | UserProfileDto, UpdateProfileDto, AvatarUploadUrlDto schemas |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `boring-avatars` | Inline SVG with CRC32 hash | boring-avatars is simpler and battle-tested; inline SVG saves a dep but requires more code |
| `resend` SDK | Fetch to Resend API directly | SDK provides error handling and TypeScript types; no meaningful advantage to raw fetch |
| `@auth/core/jwt decode` | `jose.compactDecrypt` + HKDF manually | Both work; `@auth/core` decode is the canonical approach and hides HKDF complexity |

**Installation (apps/web):**
```bash
pnpm --filter @repo/web add next-auth@beta @auth/prisma-adapter resend boring-avatars
```

**Installation (apps/api):**
```bash
pnpm --filter @repo/api add @nestjs/passport passport-jwt @auth/core @aws-sdk/client-s3 @aws-sdk/s3-request-presigner ioredis bcrypt
pnpm --filter @repo/api add -D @types/passport-jwt @types/bcrypt
```

**Installation (packages/shared — types/DTOs):**
```bash
# no new runtime deps; zod already present
```

**Version verification (run dates — 2026-06-12):**
```bash
npm view next-auth dist-tags   # beta: 5.0.0-beta.31
npm view @auth/prisma-adapter version  # 2.11.2
npm view @auth/core version    # 0.34.3
npm view resend version        # 6.12.4
npm view boring-avatars version  # 2.0.4
npm view @aws-sdk/s3-request-presigner version  # 3.1067.0
```

---

## Package Legitimacy Audit

> slopcheck was unavailable at research time. All packages are marked [ASSUMED] per graceful degradation policy; verified against npm registry and official source repos manually.

| Package | Registry | Age | Downloads | Source Repo | slopcheck | Disposition |
|---------|----------|-----|-----------|-------------|-----------|-------------|
| `next-auth@beta` | npm | ~8 yrs | Very high | github.com/nextauthjs/next-auth | [ASSUMED] | Approved — official NextAuth project |
| `@auth/prisma-adapter` | npm | ~3 yrs | High | github.com/nextauthjs/next-auth | [ASSUMED] | Approved — same monorepo as next-auth |
| `@auth/core` | npm | ~3 yrs | High | github.com/nextauthjs/next-auth | [ASSUMED] | Approved — same monorepo as next-auth |
| `@nestjs/passport` | npm | ~7 yrs | Very high | github.com/nestjs/passport | [ASSUMED] | Approved — official NestJS organization |
| `passport-jwt` | npm | ~10 yrs | Very high | github.com/mikenicholson/passport-jwt | [ASSUMED] | Approved — well-established Passport strategy |
| `resend` | npm | ~3 yrs | High | github.com/resend/resend-node | [ASSUMED] | Approved — official Resend SDK |
| `boring-avatars` | npm | ~4 yrs | Moderate | github.com/boringdesigners/boring-avatars | [ASSUMED] | Approved — dedicated website, OSS |
| `@aws-sdk/client-s3` | npm | ~4 yrs | Very high | github.com/aws/aws-sdk-js-v3 | [ASSUMED] | Approved — official AWS SDK |
| `@aws-sdk/s3-request-presigner` | npm | ~4 yrs | Very high | github.com/aws/aws-sdk-js-v3 | [ASSUMED] | Approved — official AWS SDK companion |
| `ioredis` | npm | ~8 yrs | Very high | github.com/redis/ioredis | [ASSUMED] | Approved — standard Redis client for Node.js |
| `bcrypt` | npm | ~10 yrs | Very high | github.com/kelektiv/node.bcrypt.js | [ASSUMED] | Approved — long-standing, project-specified |

**Packages removed due to slopcheck [SLOP] verdict:** none

**Packages flagged as suspicious [SUS]:** none

*All packages verified manually against npm registry and official GitHub repositories. No suspicious postinstall scripts found. slopcheck was unavailable — planner should add checkpoint:human-verify before first install if following strict protocol.*

---

## Architecture Patterns

### System Architecture Diagram

```
Browser
  │
  ├──[GET /login, /register]──────────────────────────────────────────────────►
  │                                                                    Next.js (port 3000)
  │                                                                    apps/web
  │◄──[HTML, forms]────────────────────────────────────────────────────────────
  │
  ├──[POST /api/auth/callback/credentials]─────────────────────────────────────►
  │   (email + password form submit)                                   NextAuth route handler
  │                                                                     └─ authorize() → bcrypt.compare
  │                                                                     └─ signIn() callback → emailVerified gate
  │                                                                     └─ jwt() callback → adds userId/role/cefrLevel
  │                                                                     └─ PrismaAdapter writes User/Account
  │                                                                     └─ Sets JWE cookie: authjs.session-token
  │◄──[Set-Cookie: authjs.session-token (HttpOnly)]────────────────────────────
  │
  ├──[GET /api/auth/callback/google]───────────────────────────────────────────►
  │   (Google OAuth redirect)                                          NextAuth Google provider
  │                                                                     └─ allowDangerousEmailAccountLinking: true
  │                                                                     └─ emailVerified = new Date()
  │                                                                     └─ PrismaAdapter upserts User/Account
  │◄──[Set-Cookie: authjs.session-token]───────────────────────────────────────
  │
  ├──[Server Action: sendVerificationEmail]────────────────────────────────────►
  │                                                                    Resend SDK
  │                                                                     └─ stores token in VerificationToken table
  │                                                                     └─ resend.emails.send({ html: link })
  │
  ├──[GET /verify-email?token=...]─────────────────────────────────────────────►
  │                                                                    Next.js route handler
  │                                                                     └─ validates VerificationToken
  │                                                                     └─ sets User.emailVerified = now()
  │
  ├──[Authorization: Bearer <JWE>]─────────────────────────────────────────────►
  │   (Next.js Server Component or client fetch)                       NestJS (port 3001)
  │                                                                    apps/api
  │                                                                    JwtAuthGuard
  │                                                                     └─ extracts token from header
  │                                                                     └─ @auth/core/jwt decode({ token, secret, salt })
  │                                                                     └─ attaches decoded payload to req.user
  │                                                                     └─ UsersController / ProfileController
  │                                                                     └─ PrismaService → PostgreSQL
  │◄──[JSON: UserProfileDto]────────────────────────────────────────────────────
  │
  ├──[POST /api/profile/avatar/upload-url]──────────────────────────────────────►
  │                                                                    NestJS ProfileController
  │                                                                     └─ validate size ≤ 2MB, MIME in allow-list
  │                                                                     └─ S3Client.getSignedUrl(PutObjectCommand)
  │◄──[{ uploadUrl, key }]──────────────────────────────────────────────────────
  │
  ├──[PUT <uploadUrl> with file binary]─────────────────────────────────────────►
  │   (Browser uploads directly)                                       MinIO (dev) / R2 (prod)
  │◄──[200 OK]──────────────────────────────────────────────────────────────────
  │
  └──[PATCH /api/users/me { avatarKey }]────────────────────────────────────────►
                                                                        NestJS UsersController
                                                                         └─ User.avatarUrl = key
                                                                         └─ PrismaService.user.update()
```

### Recommended Project Structure
```
apps/web/src/
├── app/
│   ├── (auth)/                     # Auth route group (no shared layout with dashboard)
│   │   ├── login/page.tsx
│   │   ├── register/page.tsx
│   │   ├── verify-email/page.tsx   # Shown after signup; handles resend button
│   │   └── reset-password/
│   │       ├── page.tsx            # "Enter your email" form
│   │       └── confirm/page.tsx    # "Enter new password" form (token in query param)
│   ├── (dashboard)/                # Protected route group
│   │   ├── layout.tsx              # Auth-gated layout using auth()
│   │   ├── dashboard/page.tsx      # Placeholder; fleshes out in Phase 8
│   │   └── profile/page.tsx        # PROF-01/02/03
│   └── api/
│       └── auth/
│           └── [...nextauth]/route.ts   # NextAuth route handler
├── auth.ts                         # NextAuth config (providers, adapter, callbacks)
├── middleware.ts                   # Route protection via NextAuth authorized callback
└── lib/
    ├── auth-actions.ts             # Server actions: sendVerificationEmail, sendPasswordReset
    └── email-templates.tsx         # React Email or HTML string templates

apps/api/src/
├── auth/
│   ├── auth.module.ts
│   ├── jwt.strategy.ts             # Custom strategy using @auth/core/jwt decode
│   └── jwt-auth.guard.ts           # JwtAuthGuard extending AuthGuard('jwt') or CanActivate
├── users/
│   ├── users.module.ts
│   ├── users.controller.ts         # GET /api/users/me, PATCH /api/users/me
│   ├── users.service.ts
│   └── dto/
│       ├── user-profile.dto.ts
│       └── update-profile.dto.ts
└── profile/
    ├── profile.module.ts
    ├── profile.controller.ts       # POST /api/profile/avatar/upload-url
    └── profile.service.ts          # S3Client presigned URL generation

packages/shared/src/
├── index.ts                        # Barrel export
├── user.dto.ts                     # UserProfileDto, UpdateProfileDto, AvatarUploadUrlDto
└── auth.types.ts                   # JwtPayload type (userId, role, cefrLevel)
```

### Pattern 1: NextAuth v5 Configuration (auth.ts)
**What:** Central auth config with Credentials + Google, PrismaAdapter, jwt/session callbacks
**When to use:** This is the single source of truth for all auth configuration

```typescript
// apps/web/src/auth.ts
// Source: https://authjs.dev/getting-started/installation, https://authjs.dev/reference/nextjs

import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@repo/database";
import bcrypt from "bcrypt";

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma, {
    allowDangerousEmailAccountLinking: true,  // D-09
  }),
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const user = await prisma.user.findUnique({
          where: { email: credentials.email as string },
        });
        if (!user || !user.passwordHash) return null;
        const valid = await bcrypt.compare(credentials.password as string, user.passwordHash);
        if (!valid) return null;
        return user;
      },
    }),
    Google,
  ],
  session: { strategy: "jwt", maxAge: 30 * 24 * 60 * 60 },  // D-14
  callbacks: {
    async signIn({ user, account }) {
      // D-10: Google users skip email verification
      if (account?.provider === "google") return true;
      // D-01: Gate Credentials users on emailVerified
      if (!user.emailVerified) {
        // Return false to block sign-in; caller sees an error
        // Alternatively throw new Error("email-not-verified") to pass error code
        return "/verify-email?error=not-verified";
      }
      return true;
    },
    async jwt({ token, user, account }) {
      if (user) {
        // D-13: Add userId, role, cefrLevel on first sign-in
        token.userId = user.id;
        token.role = user.role;
        token.cefrLevel = user.cefrLevel;
      }
      if (account?.provider === "google" && user) {
        // D-10: Google users are verified on account creation
        await prisma.user.update({
          where: { id: user.id },
          data: { emailVerified: new Date() },
        });
      }
      return token;
    },
    async session({ session, token }) {
      session.user.userId = token.userId as string;
      session.user.role = token.role as string;
      session.user.cefrLevel = token.cefrLevel as string;
      return session;
    },
  },
  pages: {
    signIn: "/login",
    verifyRequest: "/verify-email",
    error: "/login",
  },
});
```

### Pattern 2: NestJS JwtAuthGuard Using @auth/core/jwt decode
**What:** Custom guard that decrypts Auth.js v5 JWE tokens
**When to use:** ALL NestJS endpoints that require authentication

```typescript
// apps/api/src/auth/jwt-auth.guard.ts
// Source: https://authjs.dev/reference/core/jwt + https://github.com/nextauthjs/next-auth/discussions/9133

import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { decode } from "@auth/core/jwt";

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly config: ConfigService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers["authorization"];

    if (!authHeader?.startsWith("Bearer ")) {
      throw new UnauthorizedException("Missing Bearer token");
    }

    const token = authHeader.slice(7);
    const secret = this.config.get<string>("NEXTAUTH_SECRET");
    const isProd = this.config.get("NODE_ENV") === "production";
    // Salt must match the cookie name used by Auth.js
    // Dev: "authjs.session-token"  |  Prod: "__Secure-authjs.session-token"
    const salt = isProd
      ? "__Secure-authjs.session-token"
      : "authjs.session-token";

    try {
      const payload = await decode({ token, secret, salt });
      if (!payload) throw new UnauthorizedException("Invalid token");
      request.user = payload;  // { userId, role, cefrLevel, email, ... }
      return true;
    } catch {
      throw new UnauthorizedException("Token decode failed");
    }
  }
}
```

**CRITICAL NOTE on D-12 — "passport-jwt" is used for token extraction, not verification:**
Auth.js v5 issues JWE (A256CBC-HS512 encrypted) tokens, not plain JWS (signed-only) JWTs.
`passport-jwt`'s `JwtFromRequest.fromAuthHeaderAsBearerToken()` can still extract the raw
token string from the Authorization header, but `passport-jwt`'s built-in `secretOrKey`
verify step will fail on JWE tokens. The guard above uses `decode()` from `@auth/core/jwt`
which handles HKDF key derivation and JWE decryption correctly.
`@nestjs/passport` and `passport-jwt` may be installed for consistency with later phases
but the JwtAuthGuard should implement `CanActivate` directly (not extend `AuthGuard('jwt')`).
[CITED: https://authjs.dev/reference/core/jwt + community verification via GitHub discussions #9133, #11811]

### Pattern 3: Resend Email Sending
**What:** Sending verification and password reset emails via Resend SDK
**When to use:** After registration (verification) and after password reset request

```typescript
// apps/web/src/lib/auth-actions.ts (Server Action)
// Source: https://resend.com/docs/send-with-nodejs
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendVerificationEmail(email: string, token: string) {
  const url = `${process.env.NEXTAUTH_URL}/verify-email?token=${token}`;
  const { error } = await resend.emails.send({
    from: "noreply@yourdomain.com",  // must be verified domain in Resend dashboard
    to: email,
    subject: "Verify your email address",
    html: `<p>Click <a href="${url}">here</a> to verify your email. Link expires in 24 hours.</p>`,
    idempotencyKey: `verify-email/${email}`,
    tags: [{ name: "type", value: "email-verification" }],
  });
  if (error) throw new Error(`Failed to send verification email: ${error.message}`);
}
```

**Note:** Resend SDK does NOT throw on send failure — always check the `error` object.
[CITED: https://resend.com/docs/send-with-nodejs]

### Pattern 4: Presigned URL Avatar Upload
**What:** NestJS endpoint generates presigned PUT URL; browser uploads directly to MinIO/R2
**When to use:** User updates avatar on profile page

```typescript
// apps/api/src/profile/profile.service.ts
// Source: https://aws.amazon.com/blogs/developer/generate-presigned-url-modular-aws-sdk-javascript/
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_SIZE_BYTES = 2 * 1024 * 1024; // 2 MB (D-08)

async generateAvatarUploadUrl(userId: string, filename: string, contentType: string, sizeBytes: number) {
  if (!ALLOWED_MIME_TYPES.includes(contentType)) {
    throw new BadRequestException(`Content type ${contentType} not allowed`);
  }
  if (sizeBytes > MAX_SIZE_BYTES) {
    throw new BadRequestException(`File size ${sizeBytes} exceeds 2 MB limit`);
  }

  const key = `avatars/${userId}/${Date.now()}-${filename}`;
  const command = new PutObjectCommand({
    Bucket: process.env.MINIO_BUCKET,
    Key: key,
    ContentType: contentType,
    ContentLength: sizeBytes,
  });

  const uploadUrl = await getSignedUrl(this.s3Client, command, { expiresIn: 300 }); // 5 min
  return { uploadUrl, key };
}
```

### Pattern 5: Password Reset Token Storage
**What:** Store reset token in Prisma `VerificationToken` table (reuses existing NextAuth table)
**When to use:** Password reset flow (AUTH-04)
**Recommendation:** Use the `VerificationToken` table with `identifier = "password-reset:${userId}"`, `token = crypto.randomBytes(32).toString('hex')`, `expires = Date.now() + 24h`. This avoids adding a new table.

```typescript
// apps/web/src/lib/auth-actions.ts
import crypto from "crypto";
import { prisma } from "@repo/database";

export async function createPasswordResetToken(email: string) {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return; // Don't reveal whether email exists
  const token = crypto.randomBytes(32).toString("hex");
  const expires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24h (D-03)
  await prisma.verificationToken.upsert({
    where: { identifier_token: { identifier: `password-reset:${user.id}`, token } },
    create: { identifier: `password-reset:${user.id}`, token, expires },
    update: { token, expires },
  });
  // Send reset email via Resend...
}
```

### Pattern 6: Route Protection Middleware
**What:** Next.js middleware using auth() to redirect unauthenticated users
**When to use:** All routes under `/(dashboard)` group

```typescript
// apps/web/src/middleware.ts
// Source: https://authjs.dev/getting-started/session-management/protecting
export { auth as middleware } from "@/auth";

export const config = {
  matcher: ["/dashboard/:path*", "/profile/:path*"],
};
```

For Next.js 14 (not 16+), use `middleware.ts` (not `proxy.ts`).
[CITED: https://authjs.dev/getting-started/session-management/protecting]

### Anti-Patterns to Avoid
- **Using `passport-jwt`'s `secretOrKey` to verify Auth.js v5 tokens:** JWE tokens will fail verification because `jsonwebtoken.verify()` cannot handle encrypted tokens. Use `@auth/core/jwt decode` instead.
- **Sending password reset confirmation to a fake email:** Never confirm whether an email address exists in the system. Return the same response for found and not-found email addresses.
- **Storing avatarUrl as a full CDN URL in the database:** Phase 1 decision (D-10) requires storing only storage keys. NestJS reconstructs the full URL at runtime.
- **Setting `emailVerified` in the `jwt` callback for Credentials users:** Google users get `emailVerified` set (D-10); Credentials users must click the link. Don't conflate the two.
- **Using NextAuth's built-in Email provider for transactional email:** The built-in Email provider requires a nodemailer-compatible adapter. The project uses Resend HTTP API (not nodemailer). Build a custom flow.
- **Using hardcoded `AUTH_SECRET` in source code:** Always read from `process.env.NEXTAUTH_SECRET`. Auth.js v5 reads `AUTH_SECRET` automatically; both env var names are accepted.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| OAuth flow state management | Custom OAuth redirect handler | NextAuth Google provider | OAuth has many edge cases: state parameter CSRF, token refresh, scope handling |
| Password hashing | Custom hash function | `bcrypt` (12 rounds) | bcrypt is time-bounded against GPU attacks; custom crypto is almost always wrong |
| JWT encryption/decryption | Manual HKDF + AES implementation | `@auth/core/jwt decode()` | Auth.js-specific JWE requires exact HKDF salt derivation; one wrong parameter breaks all sessions |
| S3 presigned URL signing | Custom AWS request signing | `@aws-sdk/s3-request-presigner` | AWS Signature v4 signing is complex and version-sensitive |
| Deterministic avatar generation | CRC32 color + SVG by hand | `boring-avatars` | The hash-to-palette math is trivial but consistency and React integration are already solved |
| Session expiry tracking | Redis TTL sessions | NextAuth JWT `maxAge` | JWT with maxAge + cookie expiry is automatic; Redis sessions add infrastructure complexity |

**Key insight:** Auth has more edge cases per line of code than any other domain. The entire purpose of NextAuth/Auth.js is to handle these so you don't have to.

---

## Common Pitfalls

### Pitfall 1: Auth.js v5 JWE vs JWS confusion
**What goes wrong:** Developer installs `passport-jwt` and configures `secretOrKey: process.env.JWT_SECRET`. NestJS guards return 401 on every request even though the token looks valid.
**Why it happens:** Auth.js v5 issues JWE tokens (encrypted), not JWS tokens (signed only). `jsonwebtoken.verify()` and `passport-jwt` expect JWS format. The JWE envelope starts with 5 base64url segments; `jsonwebtoken.verify()` fails with "invalid token format."
**How to avoid:** Use `decode()` from `@auth/core/jwt` in a custom `CanActivate` guard (see Pattern 2). Do not use `AuthGuard('jwt')` from passport-jwt for Auth.js v5 tokens.
**Warning signs:** 401 responses from NestJS even when the cookie/header contains a valid Auth.js session token; "invalid signature" or "invalid token" errors in NestJS logs.

### Pitfall 2: Wrong salt for @auth/core/jwt decode
**What goes wrong:** `decode()` returns `null` or throws "no matching decryption secret" even with the correct `AUTH_SECRET`.
**Why it happens:** The salt must match the cookie name exactly. In development, the cookie is `authjs.session-token`; in production (HTTPS), Auth.js adds the `__Secure-` prefix: `__Secure-authjs.session-token`. Using the wrong salt causes HKDF to derive a different encryption key.
**How to avoid:** Set salt dynamically based on `NODE_ENV`: `const salt = isProd ? "__Secure-authjs.session-token" : "authjs.session-token"`.
**Warning signs:** Works in development, fails after deployment to production (or vice versa).

### Pitfall 3: NEXTAUTH_SECRET vs AUTH_SECRET env var naming
**What goes wrong:** Auth.js v5 documentation uses `AUTH_SECRET`; Phase 1 committed to `NEXTAUTH_SECRET` in `.env.example`. Switching to `AUTH_SECRET` breaks existing dev environments.
**Why it happens:** Auth.js v5 changed the preferred env var name from `NEXTAUTH_SECRET` to `AUTH_SECRET`. Both work (backwards compatible), but tutorials using v5 use `AUTH_SECRET`.
**How to avoid:** Keep `NEXTAUTH_SECRET` from Phase 1. Both `NEXTAUTH_SECRET` and `AUTH_SECRET` are accepted by Auth.js v5. When decoding in NestJS, read `NEXTAUTH_SECRET` (the Phase 1 env var). Do not rename the env var — it would require all developers to update their `.env` files.
**Warning signs:** Auth.js warning: "No secret provided" in production despite `NEXTAUTH_SECRET` being set (only if you accidentally use the wrong variable name in the NextAuth config).

### Pitfall 4: PrismaAdapter requires User.image but schema uses User.avatarUrl
**What goes wrong:** `PrismaAdapter` maps to a field named `image` on the User model. The Phase 1 Prisma schema uses `avatarUrl`. The adapter silently fails to save avatar images from OAuth.
**Why it happens:** NextAuth PrismaAdapter expects the standard Auth.js User model which uses `image`, not `avatarUrl`. Custom field names require explicit mapping.
**How to avoid:** Either rename `avatarUrl` to `image` in the schema (breaking D-10 naming convention) OR use PrismaAdapter with a custom `profile()` callback in the provider or a `createUser` override to map `image` → `avatarUrl`. Investigate adapter source before implementation.
**Warning signs:** Google OAuth login works but user avatar from Google is never saved; `user.avatarUrl` is null after Google sign-in even though the Google account has a profile photo.

### Pitfall 5: Email resend rate-limit state not persisting across Next.js restarts
**What goes wrong:** The resend button allows more than 3 resends per hour after Next.js restarts, or during load-balanced deployments.
**Why it happens:** If rate-limit counters are stored in-memory (e.g., a Map), they reset on restart. D-02 requires server-side enforcement.
**How to avoid:** Store rate-limit counters in Redis (`REDIS_URL_CACHE` instance from Phase 1). Key pattern: `email-resend:rate:{userId}` with TTL of 3600 seconds. Use `INCR` + `EXPIRE` atomic pattern.
**Warning signs:** Rate limiting works in development but not after deployment; multiple server instances don't share rate-limit state.

### Pitfall 6: Resend SDK never throws on send failure
**What goes wrong:** Email silently fails to send; user never gets verification link; no error visible to developer.
**Why it happens:** The Resend SDK always returns `{ data, error }` and never throws. Developers often copy the "happy path" example and forget to check `error`.
**How to avoid:** Always destructure and check `error`: `const { error } = await resend.emails.send(...); if (error) { ... }`. Log and surface failures appropriately.
**Warning signs:** Users report not receiving emails; no exception in server logs despite send failure.

---

## Code Examples

### TypeScript type augmentation for NextAuth session
```typescript
// apps/web/src/types/next-auth.d.ts
// Source: Auth.js v5 documentation on type augmentation
import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      userId: string;
      role: "STUDENT" | "ADMIN";
      cefrLevel: "B1" | "B2" | "C1";
    } & DefaultSession["user"];
  }
  interface JWT {
    userId?: string;
    role?: string;
    cefrLevel?: string;
  }
}
```

### Shared JwtPayload type in packages/shared
```typescript
// packages/shared/src/auth.types.ts
import { z } from "zod";

export const JwtPayloadSchema = z.object({
  userId: z.string(),
  role: z.enum(["STUDENT", "ADMIN"]),
  cefrLevel: z.enum(["B1", "B2", "C1"]),
  email: z.string().email().optional(),
});

export type JwtPayload = z.infer<typeof JwtPayloadSchema>;
```

### User Profile DTO (shared)
```typescript
// packages/shared/src/user.dto.ts
import { z } from "zod";

export const UserProfileDtoSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  name: z.string().nullable(),
  avatarUrl: z.string().nullable(),
  cefrLevel: z.enum(["B1", "B2", "C1"]),
  xpTotal: z.number(),
  level: z.number(),
  createdAt: z.string().datetime(),
  lastActiveAt: z.string().datetime(),
  emailVerified: z.string().datetime().nullable(),
});

export const UpdateProfileDtoSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  avatarKey: z.string().optional(), // storage key from presigned upload
});

export const AvatarUploadUrlRequestSchema = z.object({
  filename: z.string(),
  contentType: z.enum(["image/jpeg", "image/png", "image/webp"]),
  sizeBytes: z.number().max(2 * 1024 * 1024),
});

export type UserProfileDto = z.infer<typeof UserProfileDtoSchema>;
export type UpdateProfileDto = z.infer<typeof UpdateProfileDtoSchema>;
export type AvatarUploadUrlRequest = z.infer<typeof AvatarUploadUrlRequestSchema>;
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| NextAuth v4 (NEXTAUTH_SECRET, Pages Router) | Auth.js v5 (AUTH_SECRET, App Router native) | 2024 (beta stabilized) | Route handlers replace API routes; auth() usable in server components |
| NextAuth v4 plain JWT (JWS) | Auth.js v5 JWE (encrypted JWT, A256CBC-HS512) | Auth.js v5 | Backend services cannot use standard jwt.verify(); must use @auth/core/jwt decode() |
| passport-jwt with secretOrKey for NestJS | Custom CanActivate using @auth/core/jwt decode | 2024 | passport-jwt incompatible with JWE; custom guard needed |
| NextAuth salt = "" (v4) | Auth.js salt = cookie name (v5) | Auth.js v5 | HKDF derivation changed; old HKDF keys cannot decrypt v5 tokens |

**Deprecated/outdated:**
- `NEXTAUTH_SECRET` naming: still works, but `AUTH_SECRET` is preferred in v5 docs. Keep `NEXTAUTH_SECRET` for Phase 1 consistency.
- `pages/api/auth/[...nextauth].ts`: Pages Router pattern. This project uses App Router; use `app/api/auth/[...nextauth]/route.ts` with `export const { GET, POST } = handlers`.
- `getServerSession()` from `next-auth/next`: v4 API. Use `auth()` from your `auth.ts` export in v5.

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `bcrypt` version 5.x is already installed or will be installed as the hashing library | Standard Stack | Low — well-established, project-specified in CLAUDE.md; confirm with `npm view bcrypt version` |
| A2 | `PrismaAdapter` `allowDangerousEmailAccountLinking` option is available in `@auth/prisma-adapter@2.x` | Code Examples | Medium — if not in 2.x, account linking must be handled via custom `linkAccount` adapter method |
| A3 | The `VerificationToken` table (already in schema) is suitable for password reset tokens without modification | Architecture Patterns | Low — table has `identifier`, `token`, `expires` which suffices; no schema change needed |
| A4 | `User.avatarUrl` field needs explicit mapping in PrismaAdapter since standard Auth.js User model uses `image` | Common Pitfalls | High — if unmapped, Google OAuth avatar URLs from provider are silently dropped; needs investigation at implementation time |
| A5 | Resend free tier (3,000 emails/month) is sufficient for Phase 2 local testing | Environment | Low — local dev will send few emails; production may need paid plan later |
| A6 | `@auth/core@0.34.3` exports `decode` function compatible with `next-auth@5.0.0-beta.31` JWE format | Architecture Patterns | Medium — both packages are from the nextauthjs/next-auth monorepo and should be compatible at these versions; verify at implementation |

---

## Open Questions

1. **PrismaAdapter field name mapping for avatarUrl vs image**
   - What we know: Standard Auth.js User model has `image`; project schema uses `avatarUrl`
   - What's unclear: Whether `@auth/prisma-adapter@2.x` supports custom field mapping or requires a field named `image`
   - Recommendation: Read `@auth/prisma-adapter` source code at implementation time; if `image` is required, add an `image String?` field aliased to `avatarUrl` OR use a Prisma `@map("avatar_url")` alias

2. **Where to run Resend email sending — apps/web Server Action vs NestJS**
   - What we know: D-15 assigns all email flows to NextAuth (apps/web); D-04 specifies `RESEND_API_KEY` in `apps/api` OR `apps/web`
   - What's unclear: Whether the email send should live in Next.js Server Actions (cleanest) or be a NestJS endpoint called by Next.js
   - Recommendation: Server Actions in apps/web — keeps email logic co-located with auth flows; avoids an unnecessary HTTP hop to NestJS for transactional email

3. **Redis availability for email rate-limiting (D-02)**
   - What we know: Redis is available via Docker; `REDIS_URL_CACHE` is the cache Redis instance from Phase 1
   - What's unclear: Whether to use `ioredis` directly in Next.js Server Actions or proxy through a NestJS endpoint for rate-limit enforcement
   - Recommendation: Use `ioredis` in a Next.js Server Action with `REDIS_URL_CACHE`; it's simpler and keeps the rate-limit logic with the email send action

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Docker | MinIO/Redis containers | ✓ | 29.4.2 | — |
| Node.js | Runtime | ✓ | 22.22.2 | — |
| pnpm | Package manager | ✓ | 9.15.9 | — |
| PostgreSQL | Prisma / PrismaAdapter | ✓ (via Docker) | 16.x (Docker image) | — |
| Redis | Email resend rate-limiting | ✓ (via Docker) | 7.x (Docker image) | — |
| MinIO | Avatar presigned URL upload target | ✓ (via Docker) | — | R2 in prod |
| RESEND_API_KEY | Email sending | ✗ (must be configured) | — | Check Resend dashboard |
| GOOGLE_CLIENT_ID/SECRET | Google OAuth | ✗ (must be configured) | — | Can skip Google OAuth in local dev; Credentials-only login still works |

**Missing dependencies with no fallback:**
- None that block core functionality. Email and Google OAuth require external credentials but are not needed to test the Credentials flow locally.

**Missing dependencies with fallback:**
- `RESEND_API_KEY`: Local dev can use Resend's test mode or temporarily log email links to console.
- `GOOGLE_CLIENT_ID/SECRET`: Local dev can use Credentials-only login; Google OAuth can be validated against a test Google Cloud project.

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 2.x |
| Config file | `apps/web/vitest.config.ts` (jsdom) + `apps/api/vitest.config.ts` (node) |
| Quick run command (api) | `pnpm --filter @repo/api test` |
| Quick run command (web) | `pnpm --filter @repo/web test` |
| Full suite command | `pnpm test` (from monorepo root via Turborepo) |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| AUTH-01 | Register user with email/password; bcrypt hash stored | Unit | `pnpm --filter @repo/api test -- --grep "register"` | ❌ Wave 0 |
| AUTH-02 | Email verification gate blocks dashboard access before verify | Integration | `pnpm --filter @repo/web test -- --grep "verify"` | ❌ Wave 0 |
| AUTH-03 | Google OAuth creates account with emailVerified set | Unit (mock OAuth) | `pnpm --filter @repo/web test -- --grep "google"` | ❌ Wave 0 |
| AUTH-04 | Password reset token: created, stored, expires correctly | Unit | `pnpm --filter @repo/web test -- --grep "password-reset"` | ❌ Wave 0 |
| AUTH-05 | Session persists across requests; 30-day maxAge in cookie | Integration | `pnpm --filter @repo/web test -- --grep "session"` | ❌ Wave 0 |
| AUTH-06 | Unauthenticated request to /dashboard redirects to /login | E2E (Playwright) | `pnpm --filter @repo/web test:e2e -- --grep "redirect"` | ❌ Wave 0 |
| PROF-01 | GET /api/users/me returns user profile fields | Integration | `pnpm --filter @repo/api test -- --grep "users.me"` | ❌ Wave 0 |
| PROF-02 | PATCH /api/users/me updates name and avatarKey | Integration | `pnpm --filter @repo/api test -- --grep "update.profile"` | ❌ Wave 0 |
| PROF-03 | CEFR level badge renders correct level from session | Component | `pnpm --filter @repo/web test -- --grep "cefr.badge"` | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** `pnpm --filter @repo/api test` and/or `pnpm --filter @repo/web test`
- **Per wave merge:** `pnpm test` (full suite from root)
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `apps/api/src/auth/jwt-auth.guard.spec.ts` — covers AUTH-01, PROF-01, PROF-02 guard behavior
- [ ] `apps/api/src/users/users.controller.spec.ts` — covers PROF-01, PROF-02
- [ ] `apps/api/src/profile/profile.service.spec.ts` — covers PROF-02 avatar upload
- [ ] `apps/web/src/app/(auth)/login/__tests__/login.test.tsx` — covers AUTH-01, AUTH-06
- [ ] `apps/web/src/app/(auth)/verify-email/__tests__/verify-email.test.tsx` — covers AUTH-02
- [ ] `apps/web/src/lib/auth-actions.test.ts` — covers AUTH-04 token creation
- [ ] E2E: `apps/web/e2e/auth.spec.ts` — covers AUTH-06 redirect behavior
- [ ] `packages/shared/src/user.dto.test.ts` — covers DTO validation

---

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | yes | NextAuth Credentials + bcrypt 12 rounds; Google OAuth via Auth.js |
| V3 Session Management | yes | NextAuth JWT, 30-day maxAge, HttpOnly cookie, Secure flag in prod |
| V4 Access Control | yes | NestJS JwtAuthGuard on all `/api/users/*` and `/api/profile/*`; Next.js middleware for page routes |
| V5 Input Validation | yes | Zod in shared DTOs; NestJS `ValidationPipe` globally applied |
| V6 Cryptography | yes | bcrypt (password), @auth/core JWE (session), crypto.randomBytes (reset tokens) — never hand-roll |

### Known Threat Patterns for Auth Stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Credential stuffing / brute-force login | Spoofing | `@nestjs/throttler` on auth endpoints; bcrypt time cost slows automated attacks |
| Email enumeration via password reset response | Information Disclosure | Return identical response whether email exists or not (see Pattern 5) |
| Expired/reused password reset tokens | Elevation of Privilege | Delete `VerificationToken` record immediately after use; 24h expiry |
| Session token leakage | Spoofing | HttpOnly + Secure cookie flags enforced by Auth.js; never expose token in JS |
| Insecure avatar upload (malicious file type) | Tampering | ContentType allow-list + sizeBytes check before presigned URL is issued (D-08) |
| OAuth account takeover via email linking | Spoofing | `allowDangerousEmailAccountLinking` only safe because Google verifies email ownership; documented risk accepted per D-09 |
| CSRF on credential forms | Spoofing | NextAuth route handler includes CSRF token protection by default |
| XSS-based session theft | Spoofing | HttpOnly cookies are inaccessible to JavaScript; no token stored in localStorage |

---

## Sources

### Primary (HIGH confidence)
- [authjs.dev/getting-started/installation](https://authjs.dev/getting-started/installation) — Auth.js v5 setup, env vars, route handler
- [authjs.dev/reference/nextjs](https://authjs.dev/reference/nextjs) — JWT and session callback signatures
- [authjs.dev/reference/core/jwt](https://authjs.dev/reference/core/jwt) — decode() function signature, JWE encryption details
- [authjs.dev/getting-started/adapters/prisma](https://authjs.dev/getting-started/adapters/prisma) — PrismaAdapter setup
- [authjs.dev/getting-started/providers/credentials](https://authjs.dev/getting-started/providers/credentials) — Credentials provider authorize() pattern
- [authjs.dev/getting-started/providers/google](https://authjs.dev/getting-started/providers/google) — Google OAuth env vars
- [authjs.dev/getting-started/session-management/protecting](https://authjs.dev/getting-started/session-management/protecting) — Route protection, middleware
- [resend.com/docs/send-with-nodejs](https://resend.com/docs/send-with-nodejs) — Resend SDK API, idempotencyKey, error handling
- [aws.amazon.com/blogs/developer/generate-presigned-url-modular-aws-sdk-javascript](https://aws.amazon.com/blogs/developer/generate-presigned-url-modular-aws-sdk-javascript/) — AWS SDK v3 presigned URL

### Secondary (MEDIUM confidence)
- [github.com/nextauthjs/next-auth/discussions/9133](https://github.com/nextauthjs/next-auth/discussions/9133) — Correct salt values for @auth/core/jwt decode (dev vs prod)
- [github.com/nextauthjs/next-auth/discussions/11811](https://github.com/nextauthjs/next-auth/discussions/11811) — NestJS guard using @auth/core/jwt decode — implementation pattern
- [gist.github.com/aegrumet/9ca3e13278b8543348bfdb270133512d](https://gist.github.com/aegrumet/9ca3e13278b8543348bfdb270133512d) — HKDF decryption of Auth.js JWE with jose
- [authjs.dev/getting-started/migrating-to-v5](https://authjs.dev/getting-started/migrating-to-v5) — AUTH_SECRET vs NEXTAUTH_SECRET compatibility

### Tertiary (LOW confidence)
- GitHub issue #5904 — JWE token external API decryption — confirms JWE nature of v5 tokens
- Medium: "Understanding Incompatibility Between JWT Verify and NextAuth.js" — confirms passport-jwt incompatibility

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all packages verified on npm registry with official source repos
- Architecture: HIGH — Auth.js v5 docs confirmed; NestJS guard pattern confirmed via community + official jwt reference
- Pitfalls: HIGH — JWE/JWS distinction confirmed via multiple independent sources and official Auth.js documentation
- Email flow: HIGH — Resend SDK confirmed via official docs
- PrismaAdapter field mapping (avatarUrl/image): MEDIUM — flagged as Assumption A4, needs verification at implementation

**Research date:** 2026-06-12
**Valid until:** 2026-07-12 (Auth.js v5 is still in beta; check for new beta releases before implementing)
