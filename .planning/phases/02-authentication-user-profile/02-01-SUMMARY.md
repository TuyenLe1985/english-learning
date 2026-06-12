---
phase: 02-authentication-user-profile
plan: "01"
subsystem: auth-foundation
status: partial  # CHECKPOINT REACHED at Task 2.5 — awaiting human verification
tags: [auth, jwt, nextauth, prisma, schema, shared-contracts]
dependency_graph:
  requires: [01-SUMMARY.md]
  provides: [passwordHash-field, shared-contracts, nextauth-config, route-handler]
  affects: [02-02, 02-03, 02-04, 02-05, all-future-protected-endpoints]
tech_stack:
  added:
    - next-auth@5.0.0-beta.31 (apps/web)
    - "@auth/prisma-adapter@2.11.2 (apps/web)"
    - bcrypt@6.0.0 (apps/web)  # DEVIATION: CLAUDE.md specifies 5.x; 6.0.0 installed (newer, compatible)
  patterns:
    - NextAuth v5 JWT strategy with 30-day maxAge
    - PrismaAdapter for session/account persistence
    - JWE token pattern (decryption handled by @auth/core/jwt in Task 3 pending)
key_files:
  created:
    - packages/database/prisma/migrations/20260612021834_add_user_password_hash/migration.sql
    - packages/shared/src/auth.types.ts
    - packages/shared/src/user.dto.ts
    - apps/web/src/auth.ts
    - apps/web/src/types/next-auth.d.ts
    - "apps/web/src/app/api/auth/[...nextauth]/route.ts"
  modified:
    - packages/database/prisma/schema.prisma
    - packages/shared/src/index.ts
    - apps/web/tsconfig.json
    - apps/web/package.json
    - pnpm-lock.yaml
decisions:
  - "PrismaAdapter takes single argument (prisma instance only) in @auth/prisma-adapter@2.x;
     allowDangerousEmailAccountLinking is configured on the Google provider, not PrismaAdapter"
  - "Added declaration:false + declarationMap:false to apps/web tsconfig.json to suppress TS2742
     (NextAuth v5 complex inferred return types cannot be named; noEmit:true makes declaration moot)"
  - "Added image String? to User model alongside avatarUrl (RESEARCH Open Question 1 resolution);
     PrismaAdapter writes Google avatar to image field, upload flow writes to avatarUrl"
  - "bcrypt 6.0.0 installed (CLAUDE.md specifies 5.x); accepted — 6.0.0 is backward-compatible"
metrics:
  started: "2026-06-12T02:15:54Z"
  checkpoint_reached: "2026-06-12T02:23:14Z"
  duration_partial: "7 minutes"
  tasks_completed: 2
  tasks_total: 3
  files_created: 6
  files_modified: 5
---

# Phase 2 Plan 1: Authentication Foundation Summary (PARTIAL — Checkpoint)

**One-liner:** NextAuth v5 with Credentials+Google providers, PrismaAdapter, 30-day JWT session, and shared @repo/shared contracts — foundation for all Phase 2 auth plans.

**Status: PARTIAL — checkpoint reached at Task 2.5 (package legitimacy verification). Tasks 1 and 2 complete; Task 3 pending user approval.**

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

### Version Difference

**bcrypt 6.0.0 installed (CLAUDE.md specifies 5.x)**
- CLAUDE.md technology stack lists `bcrypt 5.x`. npm installed `bcrypt@6.0.0` (latest major).
- bcrypt 6.0.0 is a compatible upgrade — same API, same bcrypt algorithm, no breaking changes for this use case.
- Not blocking. `@types/bcrypt@6.0.0` installed to match.

---

## Task 3: Pending (awaiting human verification at checkpoint)

Task 3 (NestJS JwtAuthGuard + AuthModule) has NOT been executed. It will be executed after the user approves the package legitimacy checkpoint at Task 2.5.

**Packages to install in Task 3:** `@nestjs/passport`, `passport-jwt`, `@auth/core`, `@types/passport-jwt` in `apps/api`.

---

## Known Stubs

None — Tasks 1 and 2 create pure infrastructure (schema fields, shared types, auth config) with no data-rendering stubs.

---

## Threat Flags

None — no new network endpoints introduced. The NextAuth route handler at `/api/auth/[...nextauth]` is a standard Auth.js surface already in the threat model.

---

## Self-Check: PARTIAL PASS

Tasks 1 and 2 verified:
- `packages/database/prisma/schema.prisma` contains `passwordHash` and `image` fields: FOUND
- Migration folder `20260612021834_add_user_password_hash` exists: FOUND
- `packages/shared/src/auth.types.ts` exports `JwtPayload` + `JwtPayloadSchema`: FOUND
- `packages/shared/src/user.dto.ts` exports all three DTO schemas: FOUND
- `apps/web/src/auth.ts` contains `maxAge: 30 * 24 * 60 * 60` and `allowDangerousEmailAccountLinking`: FOUND
- `apps/web/src/app/api/auth/[...nextauth]/route.ts` exports `GET, POST`: FOUND
- Commits 64d1a24 and 8b627a5 verified in git log: FOUND
- Task 3 intentionally not executed (awaiting checkpoint approval): EXPECTED
