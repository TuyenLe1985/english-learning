# Phase 2: Authentication + User Profile - Context

**Gathered:** 2026-06-12
**Status:** Ready for planning

<domain>
## Phase Boundary

Users can securely register (email/password), sign in via email/password or Google OAuth, manage their sessions, reset passwords via email link, and view/edit their profile (display name, avatar). Authentication is the identity layer every subsequent phase depends on. This phase also establishes the NestJS ↔ NextAuth JWT validation pattern used by all future API endpoints.

**Deliverables:**
- NextAuth v5 with email/password (Credentials) + Google OAuth providers
- Email verification gate: unverified users cannot access any content
- Password reset via email link
- User profile page: view stats + edit display name and avatar
- Avatar upload to MinIO (dev) / R2 (prod) via presigned URL
- NestJS auth module: JwtGuard validating NextAuth-issued tokens via shared secret
- NestJS profile endpoints: GET/PATCH /api/users/me, POST /api/profile/avatar/upload-url

</domain>

<decisions>
## Implementation Decisions

### Email Verification Gate
- **D-01:** Full lock — unverified users are redirected to a dedicated "verify your email" page immediately after signup; they cannot access the dashboard or any content until they click the verification link.
- **D-02:** The verify-your-email page includes a resend button with rate-limiting: 1 resend per 60 seconds, max 3 resends per hour per user. Rate limit enforced server-side (Redis counter).
- **D-03:** Verification token validity: **24 hours**. Expired tokens show a clear error with a "request new link" option.
- **D-04:** Email service: **Resend** (resend.com). HTTP API, zero SMTP config, free tier covers 3,000 emails/month. Required env var: `RESEND_API_KEY` in `apps/api` or `apps/web` (whichever sends the email).

### Avatar Strategy
- **D-05:** Avatar mechanism: **file upload to MinIO/R2 via presigned URL**. Not a URL paste field.
- **D-06:** Upload flow: client calls NestJS `POST /api/profile/avatar/upload-url` → NestJS returns a presigned PUT URL → browser uploads file directly to MinIO → browser calls NestJS `PATCH /api/users/me` with the final storage key. Large files bypass NestJS process.
- **D-07:** Default avatar for new users: **generated initials avatar** — first letter of display name, background color deterministically derived from a hash of the user's name. No external dependency. Served as an SVG or rendered client-side.
- **D-08:** Upload constraints enforced at presigned-URL generation step: **2 MB max, JPEG/PNG/WebP only**. Requests outside these constraints return a 400 with a clear error message before any presigned URL is issued.

### Google OAuth + Existing Account Handling
- **D-09:** If a Google OAuth sign-in arrives with an email that already has a password account, **auto-link** the Google account to the existing user record. Use NextAuth v5 PrismaAdapter with `allowDangerousEmailAccountLinking: true`. One user record, multiple auth methods.
- **D-10:** Google OAuth users **skip email verification**. Their `emailVerified` field is set to `new Date()` on account creation (Google already verified email ownership). These users land on the dashboard immediately.
- **D-11:** Google OAuth users will not have a password in v1. The ability to add a password later (to enable email login) is **deferred** — not in Phase 2 scope.

### NestJS ↔ NextAuth JWT Validation
- **D-12:** NestJS validates authentication using the **shared JWT secret pattern**: NextAuth signs JWT tokens with `NEXTAUTH_SECRET`; NestJS uses `@nestjs/passport` + `passport-jwt` with the same `NEXTAUTH_SECRET` to validate Bearer tokens on protected endpoints. Zero additional token infrastructure.
- **D-13:** JWT payload contains: `userId`, `role` (UserRole enum: STUDENT/ADMIN), `cefrLevel` (CefrLevel enum: B1/B2/C1). Enables NestJS to authorize requests and filter content without a DB lookup on every request.
- **D-14:** Session duration: **30 days** (`maxAge: 30 * 24 * 60 * 60` in NextAuth config). AUTH-05 requires session persistence across browser refresh — 30 days matches EdTech norms for regular learners.
- **D-15:** Responsibility split:
  - **NextAuth (Next.js)** owns: sign-up, sign-in (Credentials + Google), sign-out, email verification, password reset
  - **NestJS** owns: `GET /api/users/me`, `PATCH /api/users/me`, `POST /api/profile/avatar/upload-url`
  - All NestJS profile endpoints require a valid JWT (JwtGuard)

### Claude's Discretion
- Password reset token storage mechanism (database table vs. encrypted token in URL)
- Specific NestJS module structure for auth (AuthModule, UsersModule, ProfileModule)
- NextAuth route handler file location (`app/api/auth/[...nextauth]/route.ts`)
- Profile page URL (`/profile` or `/settings/profile`)
- CEFR level display format (badge, text label, or progress bar)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase Scope and Requirements
- `.planning/ROADMAP.md` — Phase 2 goal, success criteria, MVP mode, depends-on Phase 1
- `.planning/REQUIREMENTS.md` — AUTH-01–06 (authentication) and PROF-01–03 (user profile) — the full acceptance criteria this phase must satisfy
- `.planning/PROJECT.md` — Core constraints, tech stack decisions, scale targets

### Technology Stack (LOCKED)
- `CLAUDE.md` §Technology Stack — Version pins and compatibility table; these are non-negotiable:
  - NextAuth v5 (Auth.js) — App Router native
  - NestJS 11.x — `@nestjs/passport`, `passport-jwt`
  - Next.js 14.x (pin ^14.2, not 15/16)
  - Prisma 6.x — `@prisma/client@6.x` must match prisma CLI version
  - TailwindCSS 3.x (NOT v4 — shadcn/ui incompatible with Tailwind 4)
- `CLAUDE.md` §Stack Patterns by Scenario — Shared JWT secret pattern (NextAuth → NestJS), inter-service URL via Docker internal network (`http://api:3001/api`)

### Database Schema (already migrated)
- `packages/database/prisma/schema.prisma` — Phase 2 models (`User`, `Account`, `Session`) are **already defined and migrated** from Phase 1. No schema changes needed. Read before writing any auth or profile code to understand the existing field names, types, and relations.

### Prior Phase Decisions
- `.planning/phases/01-foundation-infrastructure/01-CONTEXT.md` — D-11 (env var strategy: `NEXTAUTH_SECRET`, `NEXTAUTH_URL`, `GOOGLE_CLIENT_ID/SECRET` in `apps/web`; `JWT_SECRET`, `PORT` in `apps/api`); D-12/D-13 (Docker env file strategy)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `packages/database/prisma/schema.prisma` — `User`, `Account`, `Session`, `VerificationToken` models already exist and are NextAuth PrismaAdapter-compatible. No new models needed for auth.
- `packages/shared/src/index.ts` — Empty barrel export. Phase 2 should add DTOs/Zod schemas here: `UserProfileDto`, `UpdateProfileDto`, `AvatarUploadUrlDto`.
- `apps/api/src/main.ts` — ValidationPipe already configured globally (`whitelist: true`, `transform: true`). All NestJS DTOs will be validated automatically.
- `apps/api/src/app.module.ts` — ConfigModule already imported as global. Auth/Users modules should be added to the `imports` array.

### Established Patterns
- NestJS global prefix is `/api` — all NestJS endpoints are at `/api/*` (set in `main.ts`)
- Global API port: NestJS runs on 3001, Next.js on 3000
- ConfigModule is global — env vars accessible via `ConfigService` anywhere in NestJS without re-importing

### Integration Points
- `apps/web/src/app/` — Auth pages go here: `/app/(auth)/login/page.tsx`, `/app/(auth)/register/page.tsx`, `/app/(auth)/verify-email/page.tsx`, `/app/(auth)/reset-password/page.tsx`
- NextAuth route handler: `apps/web/src/app/api/auth/[...nextauth]/route.ts`
- NestJS auth module: `apps/api/src/auth/` (new), `apps/api/src/users/` (new), `apps/api/src/profile/` (new)

</code_context>

<specifics>
## Specific Ideas

- **Resend SDK**: Use `resend` npm package (`npm install resend`) — HTTP API wrapper, `new Resend(process.env.RESEND_API_KEY)`.
- **Initials avatar**: Can use a library like `boring-avatars` or generate an SVG inline with first letter + deterministic color from `CRC32(name) % numColors`. No external image dependency.
- **NestJS JwtGuard**: Standard passport-jwt implementation — `AuthGuard('jwt')` or a custom `JwtAuthGuard` class extending it. Decodes token; injects user into `req.user`.
- **Presigned URL endpoint**: `POST /api/profile/avatar/upload-url` accepts `{ filename, contentType, sizeBytes }`, validates constraints (2 MB, allowed MIME types), returns `{ uploadUrl, key }`. Uses `@aws-sdk/client-s3` with `PutObjectCommand` + `getSignedUrl`.
- **CEFR level on profile**: Display as a badge (e.g. "B1 Intermediate") — same badge component that will be used throughout the app in later phases.

</specifics>

<deferred>
## Deferred Ideas

- **Password for Google OAuth users**: Allow users who signed up via Google to add an email/password to their account (enabling email login as a secondary method). This is a profile settings feature for a later phase.
- **MFA / two-factor authentication**: Not in scope for v1.
- **Account deletion / GDPR export**: Future phase — requires cascade deletes and data export pipeline.

</deferred>

---

*Phase: 2-Authentication + User Profile*
*Context gathered: 2026-06-12*
