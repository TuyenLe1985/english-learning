---
phase: 02-authentication-user-profile
plan: "01"
subsystem: auth-foundation
status: complete
tags: [auth, jwt, nextauth, prisma, schema, shared-contracts, nestjs-guard]
dependency_graph:
  requires: [01-SUMMARY.md]
  provides: [passwordHash-field, image-field, shared-contracts, nextauth-config, route-handler, jwt-auth-guard, auth-module]
  affects: [02-02, 02-03, 02-04, 02-05, 02-06, all-future-protected-endpoints]
tech_stack:
  added:
    - next-auth@5.0.0-beta.31 (apps/web)
    - "@auth/prisma-adapter@2.11.2 (apps/web)"
    - "@auth/core@0.34.3 (apps/api)"
    - "@nestjs/passport@11.0.5 (apps/api)"
    - passport-jwt@4.0.1 (apps/api)
    - "@types/passport-jwt (apps/api devDep)"
    - bcrypt@6.0.0 (apps/web)  # DEVIATION: CLAUDE.md specifies 5.x; 6.0.0 installed (newer, compatible)
  patterns:
    - NextAuth v5 JWT strategy with 30-day maxAge (PrismaAdapter, Credentials + Google providers)
    - Auth.js v5 JWE token pattern (A256CBC-HS512 encrypted)
    - NestJS CanActivate guard using @auth/core/jwt decode (not passport-jwt verify)
    - Env-aware salt for @auth/core/jwt decode (__Secure- prefix in production)
    - Shared @repo/shared contracts (JwtPayload, UserProfileDto, UpdateProfileDto, AvatarUploadUrlRequest)
key_files:
  created:
    - packages/database/prisma/migrations/20260612021834_add_user_password_hash/migration.sql
    - packages/shared/src/auth.types.ts
    - packages/shared/src/user.dto.ts
    - apps/web/src/auth.ts
    - apps/web/src/types/next-auth.d.ts
    - "apps/web/src/app/api/auth/[...nextauth]/route.ts"
    - apps/api/src/auth/jwt-auth.guard.ts
    - apps/api/src/auth/auth.module.ts
  modified:
    - packages/database/prisma/schema.prisma
    - packages/shared/src/index.ts
    - apps/api/src/app.module.ts
    - apps/api/src/auth/jwt.guard.spec.ts
    - apps/web/tsconfig.json
    - apps/web/package.json
    - apps/api/package.json
    - pnpm-lock.yaml
decisions:
  - "PrismaAdapter takes single argument (prisma instance only) in @auth/prisma-adapter@2.x;
     allowDangerousEmailAccountLinking is configured on the Google provider, not PrismaAdapter"
  - "Added declaration:false + declarationMap:false to apps/web tsconfig.json to suppress TS2742
     (NextAuth v5 complex inferred return types cannot be named; noEmit:true makes declaration moot)"
  - "Added image String? to User model alongside avatarUrl (RESEARCH Open Question 1 resolution);
     PrismaAdapter writes Google avatar to image field, upload flow writes to avatarUrl"
  - "bcrypt 6.0.0 installed (CLAUDE.md specifies 5.x); accepted — 6.0.0 is backward-compatible"
  - "JwtAuthGuard implements CanActivate directly (NOT extending AuthGuard('jwt')) because
     Auth.js v5 issues JWE tokens that passport-jwt verify cannot decode; @auth/core/jwt decode
     handles HKDF key derivation and JWE decryption correctly (RESEARCH Pitfall 1)"
  - "NEXTAUTH_SECRET fallback to empty string ('') in guard to satisfy TypeScript — missing secret
     produces decode failure (UnauthorizedException) which is the correct behavior"
metrics:
  started: "2026-06-12T02:15:54Z"
  completed: "2026-06-12T09:38:00Z"
  duration: "~22 minutes (including checkpoint pause)"
  tasks_completed: 3
  tasks_total: 3
  files_created: 8
  files_modified: 8
  requirements_covered: [AUTH-05]
---

# Phase 2 Plan 1: Authentication Foundation Summary

**One-liner:** NextAuth v5 with Credentials+Google providers, PrismaAdapter, 30-day JWT session, NestJS JwtAuthGuard using @auth/core JWE decryption with env-aware salt, and shared @repo/shared type contracts — foundation for all Phase 2 auth plans.

---

## Completed Work

### Task 1: passwordHash + image fields + shared contracts (commit: 64d1a24)

Added `passwordHash String?` (Credentials auth) and `image String?` (PrismaAdapter Google OAuth avatar) to the User model in `packages/database/prisma/schema.prisma`. Migration `20260612021834_add_user_password_hash` applied successfully to PostgreSQL.

Created `packages/shared/src/auth.types.ts` exporting `JwtPayloadSchema` + `JwtPayload` type (userId, role, cefrLevel, optional email). Created `packages/shared/src/user.dto.ts` exporting `UserProfileDtoSchema`, `UpdateProfileDtoSchema`, `AvatarUploadUrlRequestSchema` and their inferred TypeScript types. Updated `packages/shared/src/index.ts` barrel to re-export both new files.

`pnpm --filter @repo/shared exec tsc --noEmit` exits 0.

### Task 2: NextAuth v5 config with 30-day JWT (commit: 8b627a5)

Installed `next-auth@5.0.0-beta.31`, `@auth/prisma-adapter@2.11.2`, `bcrypt@6.0.0`, `@types/bcrypt@6.0.0` in `apps/web`.

Created `apps/web/src/auth.ts` with:
- `PrismaAdapter(prisma)` with Google provider `allowDangerousEmailAccountLinking: true` (D-09)
- `Credentials` provider: `bcrypt.compare` against `user.passwordHash`, returns null for missing user/hash/mismatch
- `session: { strategy: "jwt", maxAge: 30 * 24 * 60 * 60 }` (AUTH-05, D-14)
- `jwt` callback: sets `token.userId`, `token.role`, `token.cefrLevel` on first sign-in (D-13); calls `prisma.user.update({ emailVerified: new Date() })` for Google users (D-10)
- `session` callback: copies D-13 fields to `session.user`
- `signIn` callback: gates Credentials users on `emailVerified` (D-01); Google users pass immediately (D-10)
- `pages: { signIn: "/login", error: "/login" }`
- `secret: process.env.NEXTAUTH_SECRET` (not AUTH_SECRET, per Pitfall 3)

Created `apps/web/src/types/next-auth.d.ts` augmenting `Session.user` and `JWT` with D-13 payload fields.

Created `apps/web/src/app/api/auth/[...nextauth]/route.ts` exporting `GET` and `POST` from handlers.

`pnpm --filter @repo/web exec tsc --noEmit` exits 0.

### Task 2.5: Package legitimacy checkpoint (human-approved)

User approved all packages: `next-auth@beta`, `@auth/prisma-adapter`, `@auth/core`, `@nestjs/passport`, `passport-jwt`, `bcrypt`. All verified as legitimate official packages from well-known organizations.

### Task 3: NestJS JwtAuthGuard + AuthModule (commit: b37e847)

Installed `@nestjs/passport@11.x`, `passport-jwt`, `@auth/core@0.34.3`, `@types/passport-jwt` in `apps/api`.

Created `apps/api/src/auth/jwt-auth.guard.ts`:
- Implements `CanActivate` directly (NOT extending `AuthGuard('jwt')` — Auth.js v5 JWE tokens are incompatible with passport-jwt verify)
- Extracts Bearer token from `Authorization` header; throws `UnauthorizedException` if missing or malformed
- Reads `NEXTAUTH_SECRET` via `ConfigService` (falls back to empty string for TypeScript satisfaction; decode returns null/throws on empty secret → 401)
- Computes env-aware salt: `"__Secure-authjs.session-token"` in production, `"authjs.session-token"` otherwise (RESEARCH Pitfall 2)
- Calls `decode({ token, secret, salt })` from `@auth/core/jwt`; throws `UnauthorizedException` on null result or any error
- Assigns decoded payload to `request.user`

Created `apps/api/src/auth/auth.module.ts` providing and exporting `JwtAuthGuard`.

Registered `AuthModule` in `apps/api/src/app.module.ts` imports array.

Updated `apps/api/src/auth/jwt.guard.spec.ts`: Plan 01 guard rejection tests (no-header, non-bearer, null decode, decode-throws) are now GREEN. Plan 04 admission test and AUTH-05 maxAge test remain RED (owned by Plan 04).

`pnpm --filter @repo/api exec tsc --noEmit` exits 0.

---

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] PrismaAdapter API change in v2.x**
- **Found during:** Task 2
- **Issue:** Research Pattern 1 shows `PrismaAdapter(prisma, { allowDangerousEmailAccountLinking: true })` but `@auth/prisma-adapter@2.x` only accepts a single argument. The second argument option does not exist.
- **Fix:** Moved `allowDangerousEmailAccountLinking: true` to the Google provider config where it belongs per `@auth/core` types.
- **Files modified:** `apps/web/src/auth.ts`
- **Commit:** 8b627a5

**2. [Rule 1 - Bug] TS2742 "inferred type cannot be named" for NextAuth v5 exports**
- **Found during:** Task 2 (type check)
- **Issue:** `declaration: true` inherited from `packages/tsconfig/base.json` causes TS2742 because NextAuth v5's `NextAuth()` return type references internal package paths that cannot appear in generated `.d.ts` files. Since `noEmit: true` is set, declaration generation is semantically a no-op.
- **Fix:** Added `"declaration": false, "declarationMap": false` to `apps/web/tsconfig.json` to suppress the irrelevant declarations.
- **Files modified:** `apps/web/tsconfig.json`
- **Commit:** 8b627a5

**3. [Rule 2 - Missing critical field] User.image field per RESEARCH Open Question 1**
- **Found during:** Task 1
- **Issue:** RESEARCH Open Question 1 (RESOLVED) specifies that both `image String?` (PrismaAdapter-owned) and `avatarUrl String?` (upload-owned) must exist on the User model. The plan action only mentioned `passwordHash` but the RESEARCH resolution is a correctness requirement — without `image`, the PrismaAdapter silently fails to save Google avatar URLs (Pitfall 4).
- **Fix:** Added `image String?` alongside `passwordHash String?` in the schema migration.
- **Files modified:** `packages/database/prisma/schema.prisma`, migration 20260612021834
- **Commit:** 64d1a24

**4. [Rule 1 - Bug] TypeScript strict null — NEXTAUTH_SECRET undefined**
- **Found during:** Task 3 (type check)
- **Issue:** `ConfigService.get<string>()` returns `string | undefined` but `@auth/core/jwt` `decode()` secret parameter expects `string | string[]`. TypeScript strict mode rejected undefined.
- **Fix:** Added `?? ''` fallback. An empty secret causes `decode()` to return null/throw, which produces UnauthorizedException — the correct behavior when NEXTAUTH_SECRET is not configured.
- **Files modified:** `apps/api/src/auth/jwt-auth.guard.ts`
- **Commit:** b37e847

### Version Difference

**bcrypt 6.0.0 installed (CLAUDE.md specifies 5.x)**
- CLAUDE.md technology stack lists `bcrypt 5.x`. npm installed `bcrypt@6.0.0` (latest major).
- bcrypt 6.0.0 is a compatible upgrade — same API, same bcrypt algorithm, no breaking changes for this use case.
- Not blocking. `@types/bcrypt@6.0.0` installed to match.

---

## Known Stubs

None — this plan creates pure infrastructure (schema fields, shared types, auth config, NestJS guard) with no data-rendering stubs.

---

## Threat Flags

None — no new network endpoints introduced beyond the standard Auth.js route handler (`/api/auth/[...nextauth]`), which is already in the plan's threat model. The NestJS `JwtAuthGuard` is a gate, not an endpoint.

---

## Self-Check

**Created files exist:**
- `packages/database/prisma/migrations/20260612021834_add_user_password_hash/migration.sql`: FOUND
- `packages/shared/src/auth.types.ts`: FOUND
- `packages/shared/src/user.dto.ts`: FOUND
- `apps/web/src/auth.ts`: FOUND
- `apps/web/src/types/next-auth.d.ts`: FOUND
- `apps/web/src/app/api/auth/[...nextauth]/route.ts`: FOUND
- `apps/api/src/auth/jwt-auth.guard.ts`: FOUND
- `apps/api/src/auth/auth.module.ts`: FOUND

**Key assertions:**
- `packages/database/prisma/schema.prisma` contains `passwordHash` and `image` fields: FOUND
- `apps/web/src/auth.ts` contains `maxAge: 30 * 24 * 60 * 60` and `allowDangerousEmailAccountLinking`: FOUND
- `apps/api/src/auth/jwt-auth.guard.ts` contains `decode` from `@auth/core/jwt`: FOUND
- `apps/api/src/auth/jwt-auth.guard.ts` contains `__Secure-authjs.session-token` salt: FOUND
- `apps/api/src/app.module.ts` imports `AuthModule`: FOUND

**Commits verified:**
- 64d1a24: Task 1 (passwordHash + shared contracts)
- 8b627a5: Task 2 (NextAuth v5 config)
- b37e847: Task 3 (JwtAuthGuard + AuthModule)

**Type checks:**
- `pnpm --filter @repo/shared exec tsc --noEmit`: PASSED
- `pnpm --filter @repo/web exec tsc --noEmit`: PASSED
- `pnpm --filter @repo/api exec tsc --noEmit`: PASSED

## Self-Check: PASSED
