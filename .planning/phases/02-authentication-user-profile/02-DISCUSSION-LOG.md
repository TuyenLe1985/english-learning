# Phase 2: Authentication + User Profile - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-06-12
**Phase:** 02-authentication-user-profile
**Areas discussed:** Email verification gate, Avatar strategy, Google OAuth + existing account, NestJS ↔ NextAuth validation

---

## Email Verification Gate

| Option | Description | Selected |
|--------|-------------|----------|
| Full lock — redirect to 'verify your email' page | Unverified users can't access any content. One route group behind a verified check. | ✓ |
| Soft lock — dashboard visible with a persistent banner | Unverified users see the app but can't submit exercises. More complex gate logic per feature. | |
| No lock until they try a protected action | User lands on dashboard; only blocked when attempting something requiring a verified account. | |

**User's choice:** Full lock
**Notes:** Simplest gate implementation — single middleware check on the route group.

---

| Option | Description | Selected |
|--------|-------------|----------|
| Yes — resend button with rate-limit | 1 resend per 60 seconds, max 3 per hour. Standard UX — prevents frustration if email is delayed. | ✓ |
| Yes — resend with no rate-limit | Simpler to build but risks email spam abuse. | |
| No — static page only | User must wait or sign up again if email never arrives. | |

**User's choice:** Resend with rate-limit (1/60s, max 3/hour)

---

| Option | Description | Selected |
|--------|-------------|----------|
| 24 hours | Standard industry choice — long enough for timezone differences and delayed inboxes. | ✓ |
| 1 hour | Stricter but higher friction if user doesn't check email immediately. | |
| 7 days | Very generous. Reduces support tickets but tokens linger longer. | |

**User's choice:** 24 hours

---

| Option | Description | Selected |
|--------|-------------|----------|
| Resend | Simple HTTP API, free tier 3,000 emails/month, excellent deliverability. | ✓ |
| Nodemailer + SMTP | Works but SMTP credentials in env vars, deliverability varies. | |
| Mailgun | Good deliverability, more complex setup, requires domain verification. | |

**User's choice:** Resend

---

## Avatar Strategy

| Option | Description | Selected |
|--------|-------------|----------|
| URL input only | User pastes an image URL. No upload infrastructure needed. | |
| File upload to MinIO/R2 | Full upload pipeline: presigned URL → direct upload → store key. | ✓ |
| Generated avatar only | Auto-generated from name. PROF-02 says user can update — would defer that. | |

**User's choice:** File upload to MinIO/R2

---

| Option | Description | Selected |
|--------|-------------|----------|
| NestJS issues presigned URL, client uploads directly to MinIO | NestJS returns presigned PUT URL → browser uploads directly → client reports key back. Keeps large files off NestJS. | ✓ |
| Upload through NestJS (multipart/form-data) | File goes API → NestJS → MinIO. Simpler client code but NestJS handles all bytes. | |

**User's choice:** Presigned URL (direct upload)

---

| Option | Description | Selected |
|--------|-------------|----------|
| Generated initials avatar | First letter of name, background color from name hash. No external dependency, professional look. | ✓ |
| Generic placeholder from MinIO | One default image served from storage. Simpler but less personalized. | |
| Gravatar fallback | Uses Gravatar service. Requires internet access, depends on user having Gravatar account. | |

**User's choice:** Generated initials avatar

---

| Option | Description | Selected |
|--------|-------------|----------|
| 2 MB max, JPEG/PNG/WebP only | Covers all real use cases. Reject at presigned-URL generation with clear error. | ✓ |
| 5 MB max, any image format | More permissive. GIF avatars allowed but can be distracting. | |
| 512 KB max, JPEG/PNG only | Very tight. Some phone camera photos will fail. | |

**User's choice:** 2 MB max, JPEG/PNG/WebP only

---

## Google OAuth + Existing Account

| Option | Description | Selected |
|--------|-------------|----------|
| Auto-link the Google account to the existing account | NextAuth PrismaAdapter with allowDangerousEmailAccountLinking. One user, two auth methods. | ✓ |
| Block Google sign-in with error | User must log in with password first, then link manually. | |
| Create a separate account | Two accounts for same email. Confusing — not recommended. | |

**User's choice:** Auto-link

---

| Option | Description | Selected |
|--------|-------------|----------|
| No verification required for Google OAuth users | Google already verifies email. emailVerified=now() on creation. Instant dashboard access. | ✓ |
| Same verification flow as email/password | Consistent but adds friction. Google OAuth users already have verified emails. | |

**User's choice:** No verification for Google OAuth users

---

| Option | Description | Selected |
|--------|-------------|----------|
| Not in Phase 2 — defer | Phase 2 delivers Google OAuth + email/password as two independent paths. | ✓ |
| Yes — add 'set password' on profile page in Phase 2 | More complete but adds password-hashing flow and UI to Phase 2 scope. | |

**User's choice:** Deferred

---

## NestJS ↔ NextAuth Validation

| Option | Description | Selected |
|--------|-------------|----------|
| Shared JWT secret — NestJS validates NextAuth JWT with NEXTAUTH_SECRET | @nestjs/passport + passport-jwt with same secret. Zero extra infrastructure. CLAUDE.md recommends this. | ✓ |
| NestJS as auth authority | Two token issuers, more moving parts. NextAuth CredentialsProvider calls NestJS /auth/login. | |
| Next.js proxies all API calls | Next.js Route Handlers add auth check then forward to NestJS. Extra latency hop. | |

**User's choice:** Shared JWT secret

---

| Option | Description | Selected |
|--------|-------------|----------|
| userId + role + cefrLevel | NestJS can authorize and filter content without DB lookup for common case. | ✓ |
| userId only — NestJS fetches from DB each time | Minimal token. Always fresh but adds DB query per authenticated request. | |
| Full user object in token | No DB lookups but large tokens, stale data risk. | |

**User's choice:** userId + role + cefrLevel

---

| Option | Description | Selected |
|--------|-------------|----------|
| 30 days | Matches EdTech norms — learners shouldn't be interrupted. AUTH-05: persist across refresh. | ✓ |
| 7 days | More secure but re-auth weekly adds friction for regular learners. | |
| 24 hours with silent refresh | Most secure but requires token refresh infrastructure in Phase 2. | |

**User's choice:** 30 days

---

| Option | Description | Selected |
|--------|-------------|----------|
| NestJS owns profile CRUD; NextAuth owns identity flows | Clean split: NextAuth for sign-in/out/OAuth/verify/reset; NestJS for GET/PATCH /api/users/me and avatar upload. | ✓ |
| NestJS owns everything including custom auth module | Full NestJS auth stack. NextAuth becomes thin session wrapper. | |
| Next.js Route Handlers own everything in Phase 2 | No NestJS auth work in Phase 2. NestJS used from Phase 3+. | |

**User's choice:** NestJS owns profile CRUD; NextAuth owns identity flows

---

## Claude's Discretion

- Password reset token storage mechanism (database table vs. encrypted token in URL)
- Specific NestJS module structure (AuthModule, UsersModule, ProfileModule)
- NextAuth route handler file location
- Profile page URL
- CEFR level display format

## Deferred Ideas

- Password-add for Google OAuth users — allow OAuth users to enable email login as a secondary method; profile settings feature for a later phase
- MFA / two-factor authentication
- Account deletion / GDPR data export
