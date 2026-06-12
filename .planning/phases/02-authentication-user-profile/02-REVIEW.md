---
phase: 02-authentication-user-profile
reviewed: 2026-06-12T10:00:00Z
depth: standard
files_reviewed: 34
files_reviewed_list:
  - apps/api/src/auth/jwt-auth.guard.ts
  - apps/api/src/auth/auth.module.ts
  - apps/api/src/prisma/prisma.service.ts
  - apps/api/src/prisma/prisma.module.ts
  - apps/api/src/users/users.controller.ts
  - apps/api/src/users/users.service.ts
  - apps/api/src/profile/profile.controller.ts
  - apps/api/src/profile/profile.service.ts
  - apps/api/src/app.module.ts
  - apps/web/src/auth.ts
  - apps/web/src/middleware.ts
  - apps/web/src/lib/auth-actions.ts
  - apps/web/src/lib/rate-limit.ts
  - apps/web/src/lib/email-templates.tsx
  - apps/web/src/app/api/auth/[...nextauth]/route.ts
  - apps/web/src/app/api/verify-email/route.ts
  - apps/web/src/app/api/reset-password/route.ts
  - apps/web/src/app/api/resend-verification/route.ts
  - apps/web/src/app/api/profile/me/route.ts
  - apps/web/src/app/api/profile/update/route.ts
  - apps/web/src/app/api/profile/avatar-upload-url/route.ts
  - apps/web/src/app/(auth)/login/LoginForm.tsx
  - apps/web/src/app/(auth)/register/page.tsx
  - apps/web/src/app/(auth)/reset-password/page.tsx
  - apps/web/src/app/(auth)/reset-password/confirm/page.tsx
  - apps/web/src/app/(auth)/verify-email/page.tsx
  - apps/web/src/app/(dashboard)/layout.tsx
  - apps/web/src/app/(dashboard)/profile/page.tsx
  - apps/web/src/app/(dashboard)/profile/profile-form.tsx
  - apps/web/src/lib/api-client.ts
  - apps/web/src/components/cefr-badge.tsx
  - packages/shared/src/auth.types.ts
  - packages/shared/src/user.dto.ts
  - packages/database/prisma/schema.prisma
findings:
  critical: 8
  warning: 9
  info: 4
  total: 21
status: issues_found
---

# Phase 02: Code Review Report

**Reviewed:** 2026-06-12T10:00:00Z
**Depth:** standard
**Files Reviewed:** 34
**Status:** issues_found

## Summary

This phase implements authentication (credentials + Google OAuth), email verification, password reset, user profile CRUD, and presigned avatar uploads. The architectural decisions are largely sound — bcrypt at 12 rounds, JWT from Auth.js forwarded as Bearer to NestJS, Zod validation at shared boundaries, and anti-enumeration patterns on password reset.

However, several security issues are present that must be fixed before the application handles real users. The most severe are: (1) the Bearer token sent to NestJS is the decoded JSON object rather than the raw JWE string, which will fail token validation silently in production; (2) the `createPasswordResetToken` upsert has a broken WHERE clause that will create duplicate reset tokens instead of replacing them; (3) the `verifyEmailToken` function has a TOCTOU race condition allowing token reuse; (4) the rate limiter has a non-atomic check-then-set pattern that allows bypass under concurrency; and (5) no rate limiting exists on the password-reset or login endpoints.

---

## Narrative Findings (AI reviewer)

## Critical Issues

### CR-01: Bearer token sent to NestJS is JSON-stringified decoded object, not raw JWE

**File:** `apps/web/src/lib/api-client.ts:64`
**Issue:** `fetchWithAuth` sends `Authorization: Bearer ${JSON.stringify(token)}` where `token` is the result of `getToken()` — a decoded JavaScript object (`{ userId, email, role, … }`). The NestJS `JwtAuthGuard` calls `@auth/core/jwt` `decode()` on whatever string follows `Bearer `. The `decode()` function expects a compact JWE token string (the `__Secure-authjs.session-token` cookie value), not a JSON blob. Passing a JSON-stringified object will cause `decode()` to fail, producing an `UnauthorizedException` on every protected NestJS endpoint. All `/api/users/me` and `/api/profile/avatar/upload-url` calls will return 401 in production.

**Fix:** Pass the raw session cookie value (the JWE token string) as the Bearer header. One approach is to not use `getToken()` but instead extract the raw cookie and forward it:

```typescript
// In api-client.ts — extract raw cookie value, not decoded payload
export async function fetchWithAuth(
  cookieHeader: string,
  url: string,
  init?: RequestInit,
): Promise<Response> {
  // Extract the raw JWE token string (the cookie value itself)
  const cookieName = process.env.NODE_ENV === 'production'
    ? '__Secure-authjs.session-token'
    : 'authjs.session-token';

  const match = cookieHeader
    .split(';')
    .map((c) => c.trim())
    .find((c) => c.startsWith(`${cookieName}=`));

  if (!match) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const rawToken = match.slice(cookieName.length + 1);

  return fetch(url, {
    ...init,
    headers: {
      ...(init?.headers ?? {}),
      Authorization: `Bearer ${rawToken}`,
      'Content-Type': 'application/json',
    },
    cache: 'no-store',
  });
}
```

---

### CR-02: `createPasswordResetToken` upsert WHERE clause is always a miss — creates duplicates instead of replacing

**File:** `apps/web/src/lib/auth-actions.ts:289`
**Issue:** The upsert uses `where: { identifier_token: { identifier, token } }` where `token` is a freshly generated `crypto.randomBytes(32)` value that has never been stored. The composite unique key `identifier_token` will never match an existing row because the token is new on every call. Prisma will fall through to `create` every time, resulting in multiple active password-reset tokens for the same user. An attacker who requests two resets in quick succession holds two valid 24-hour tokens — the older one is never invalidated. The `update` branch is dead code.

**Fix:** Upsert on `identifier` alone (which is unique per user for password-reset tokens). Use `deleteMany` + `create`, or a raw `ON CONFLICT DO UPDATE`:

```typescript
// Delete any existing reset token for this user, then create a fresh one
await prisma.verificationToken.deleteMany({
  where: { identifier },
});
await prisma.verificationToken.create({
  data: { identifier, token, expires },
});
```

Alternatively, add a `@@unique([identifier])` constraint to `VerificationToken` for password-reset identifiers, but this conflicts with NextAuth's usage of the same table. The delete+create pattern is safer.

---

### CR-03: TOCTOU race condition in `verifyEmailToken` allows token reuse

**File:** `apps/web/src/lib/auth-actions.ts:396-434`
**Issue:** `verifyEmailToken` finds the token record, checks expiry, updates `emailVerified`, and then deletes the token in four separate non-atomic database calls. If two requests arrive with the same token simultaneously (e.g., a user clicks the link twice, or a network retry), both can pass the `findFirst` + expiry check before either `delete` executes. Both requests will then mark `emailVerified` and attempt to delete the token; the second delete may silently succeed or fail, and both requests return `{ success: true }`. The same race exists in `resetPassword` (lines 346–384).

**Fix:** Perform the lookup and delete atomically. Use a Prisma transaction that deletes and then conditionally updates:

```typescript
export async function verifyEmailToken(token: string): Promise<VerifyEmailResult> {
  return prisma.$transaction(async (tx) => {
    // Delete-first: if this returns null the token was already consumed
    const record = await tx.verificationToken.findFirst({ where: { token } });
    if (!record) return { success: false, error: 'Invalid or unknown verification token.' };

    if (record.expires < new Date()) {
      return { success: false, expired: true, error: 'Your verification link has expired. Request a new one below.' };
    }

    // Atomic delete — if concurrent request already deleted it, this throws
    try {
      await tx.verificationToken.delete({
        where: { identifier_token: { identifier: record.identifier, token: record.token } },
      });
    } catch {
      return { success: false, error: 'Invalid or unknown verification token.' };
    }

    const user = await tx.user.findUnique({ where: { email: record.identifier } });
    if (!user) return { success: false, error: 'User not found.' };

    await tx.user.update({ where: { id: user.id }, data: { emailVerified: new Date() } });
    return { success: true };
  });
}
```

Apply the same pattern to `resetPassword`.

---

### CR-04: Rate limiter has non-atomic check-then-set — bypassable under concurrency

**File:** `apps/web/src/lib/rate-limit.ts:49-68` and `apps/web/src/lib/auth-actions.ts:231-254`
**Issue:** Both the standalone `checkEmailResendRateLimit` and the inline `checkResendRateLimit` in `auth-actions.ts` use the pattern: (1) `redis.ttl(cooldownKey)` — check, (2) `redis.get(hourlyKey)` — check, (3) `redis.incr(cooldownKey)` + `redis.expire(cooldownKey, 60)` — set. Between steps 1–2 and step 3, a concurrent request can pass both checks before either request increments. Under load (e.g., duplicate form submissions), the hourly limit of 3 can be exceeded by N concurrent requests all passing the check simultaneously.

Additionally, there are two separate Redis client instances and two separate copies of this rate-limit logic (`rate-limit.ts` and the inline version in `auth-actions.ts`). The resend API route (`apps/web/src/app/api/resend-verification/route.ts`) calls `resendVerificationEmail` from `auth-actions.ts`, which uses the inline `checkResendRateLimit` — the exported `checkEmailResendRateLimit` from `rate-limit.ts` is unused dead code.

**Fix:** Replace the multi-step check-then-set with an atomic Lua script or Redis pipeline:

```typescript
// Atomic rate-limit check using a Lua script
const LUA_RATE_LIMIT = `
  local cooldown = redis.call('TTL', KEYS[1])
  if cooldown > 0 then return {0, cooldown, 0} end
  local hourly = tonumber(redis.call('GET', KEYS[2]) or '0')
  if hourly >= tonumber(ARGV[1]) then return {0, 0, 1} end
  redis.call('INCR', KEYS[1])
  redis.call('EXPIRE', KEYS[1], ARGV[2])
  local newHourly = redis.call('INCR', KEYS[2])
  if newHourly == 1 then redis.call('EXPIRE', KEYS[2], ARGV[3]) end
  return {1, 0, 0}
`;
const [allowed, retryAfter, maxReached] = await redis.eval(
  LUA_RATE_LIMIT, 2,
  cooldownKey, hourlyKey,
  String(RATE_LIMIT_HOURLY_MAX),
  String(RATE_LIMIT_COOLDOWN_SECONDS),
  String(RATE_LIMIT_HOURLY_WINDOW_SECONDS),
) as [number, number, number];
```

Also remove the duplicate implementation in `auth-actions.ts` and consolidate to the single exported function in `rate-limit.ts`.

---

### CR-05: No rate limiting on password-reset request endpoint

**File:** `apps/web/src/app/(auth)/reset-password/page.tsx:44` and `apps/web/src/lib/auth-actions.ts:272`
**Issue:** `createPasswordResetToken` is called directly as a server action from the reset-password page with no rate limiting. An attacker can call it in a tight loop to generate thousands of reset emails for any known email address, burning through the Resend free tier (100 emails/day) or achieving a denial-of-service by flooding a target user's inbox. There is no per-IP, per-email, or per-minute throttle anywhere in this flow.

**Fix:** Apply the same Redis-based rate-limit pattern used for email resend. Add a per-email rate limit (e.g., 1 request per 60 seconds, max 3 per hour):

```typescript
export async function createPasswordResetToken(email: string): Promise<PasswordResetRequestResult> {
  // Rate-limit by email (normalized) before DB lookup — prevents enumeration via timing too
  const rateLimitResult = await checkPasswordResetRateLimit(email.toLowerCase());
  if (!rateLimitResult.allowed) {
    // Always return success shape to prevent enumeration
    return { success: true };
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return { success: true };
  // ... rest of implementation
}
```

---

### CR-06: Unvalidated `avatarKey` — path traversal / storage namespace pollution

**File:** `apps/web/src/app/api/profile/update/route.ts` → `apps/api/src/users/users.service.ts:86`
**Issue:** The `PATCH /api/users/me` endpoint accepts `{ avatarKey: string }` from the request body. `UpdateProfileDtoSchema` validates that `avatarKey` is a `z.string()` with no format constraints (`user.dto.ts:26`). A malicious authenticated user can set their `avatarUrl` to any arbitrary string: `../../../../etc/passwd`, `s3://other-bucket/admin-file`, a URL to an external domain, or another user's storage key (`avatars/victim-user-id/photo.jpg`). This lets a user "steal" another user's avatar by pointing their profile at that user's storage key, and may confuse downstream URL-construction logic.

**Fix:** Validate that `avatarKey` matches the expected storage-key format for the authenticated user:

```typescript
// In UpdateProfileDtoSchema (user.dto.ts)
avatarKey: z.string()
  .regex(/^avatars\/[a-z0-9_-]+\/\d+-[^/]+$/, 'Invalid avatar key format')
  .optional(),
```

Additionally, in `UsersService.updateMe`, assert that the key belongs to the requesting user:

```typescript
if (dto.avatarKey !== undefined) {
  // Ensure key is scoped to this user's prefix
  if (!dto.avatarKey.startsWith(`avatars/${userId}/`)) {
    throw new BadRequestException('Avatar key does not belong to this user.');
  }
  data['avatarUrl'] = dto.avatarKey;
}
```

---

### CR-07: JWT payload fields `role` and `cefrLevel` are never refreshed — stale authorization data

**File:** `apps/web/src/auth.ts:60-67`
**Issue:** The `jwt` callback embeds `userId`, `role`, and `cefrLevel` into the JWT only when `user` is truthy (i.e., only on first sign-in). With a 30-day JWT session (`maxAge: 30 * 24 * 60 * 60`), the `role` and `cefrLevel` baked into the token at sign-in time will persist for up to 30 days even if the user's role is elevated to `ADMIN` or their CEFR level changes. NestJS reads `request.user.role` directly from the decoded JWT token without re-querying the database — an ADMIN downgrade to STUDENT will not take effect until the user signs out and back in.

This is a privilege-persistence bug for role changes. For a learning platform it primarily affects CEFR level updates not being reflected. However, if admin access is revoked, the user retains admin-equivalent JWT claims for up to 30 days.

**Fix:** Either shorten the JWT `maxAge` to 1–7 days for more frequent refresh, or add a token version/generation counter to the User table and check it on sensitive operations. For the role field specifically:

```typescript
// In jwt callback — always re-read role from DB on token refresh
async jwt({ token, user }) {
  if (user) {
    token.userId = user.id;
    token.role = (user as { role?: string }).role;
    token.cefrLevel = (user as { cefrLevel?: string }).cefrLevel;
  }
  // Refresh role+cefrLevel from DB periodically (e.g., every hour)
  if (token.userId && (!token.roleRefreshedAt || Date.now() - (token.roleRefreshedAt as number) > 3600_000)) {
    const dbUser = await prisma.user.findUnique({
      where: { id: token.userId as string },
      select: { role: true, cefrLevel: true },
    });
    if (dbUser) {
      token.role = dbUser.role;
      token.cefrLevel = dbUser.cefrLevel;
      token.roleRefreshedAt = Date.now();
    }
  }
  return token;
},
```

---

### CR-08: `verifyEmailToken` looks up user by `record.identifier` (email), but password-reset tokens use `password-reset:{userId}` as identifier — identifier-type collision

**File:** `apps/web/src/lib/auth-actions.ts:415`
**Issue:** `verifyEmailToken` calls `prisma.user.findUnique({ where: { email: record.identifier } })`. This assumes the `identifier` field contains an email address. Password-reset tokens use `identifier = "password-reset:{userId}"` (line 285). If a password-reset token is accidentally submitted to the email verification endpoint (e.g., the user clicks the wrong link), `verifyEmailToken` will call `prisma.user.findUnique({ where: { email: "password-reset:{userId}" } })` — no match found, returns `{ success: false, error: 'User not found.' }`. This is a graceful failure, but the error message "User not found" could be confusing.

More critically, the reverse is also true: a valid email-verification token whose identifier is a plain email address is also a valid identifier in the password-reset lookup path (`resetPassword` at line 363 does `record.identifier.replace('password-reset:', '')` — if the identifier doesn't contain that prefix, the entire identifier string is used as a userId). An email-verification token with identifier `"user@example.com"` submitted to the reset-password endpoint will attempt `prisma.user.update({ where: { id: "user@example.com" } })`, failing silently.

**Fix:** Add a `type` prefix guard at the top of each token-consuming function:

```typescript
// In verifyEmailToken:
if (record.identifier.startsWith('password-reset:')) {
  return { success: false, error: 'Invalid verification token.' };
}

// In resetPassword:
if (!record.identifier.startsWith('password-reset:')) {
  return { success: false, error: 'Invalid reset token.' };
}
```

---

## Warnings

### WR-01: `registerUser` has no rate limiting — credential-stuffing and abuse vector

**File:** `apps/web/src/lib/auth-actions.ts:82`
**Issue:** `registerUser` is a server action called directly from the register page with no per-IP or per-email rate limiting. An attacker can create thousands of accounts programmatically, exhausting CEFR level defaults, burning DB capacity, or using the app as an email spam relay (each registration triggers a verification email via Resend). The function's only guard is a duplicate-email check, which does not protect against registrations with fresh email addresses.

**Fix:** Add Redis-based rate limiting on registration by IP (extractable from request headers in server actions via `headers()`) — at minimum 5 registrations per IP per hour.

---

### WR-02: `UsersService.updateMe` uses `prisma.user.update` without catching Prisma P2025 — unhandled rejection on nonexistent userId

**File:** `apps/api/src/users/users.service.ts:89`
**Issue:** `prisma.user.update({ where: { id: userId } })` will throw a Prisma `PrismaClientKnownRequestError` with code `P2025` ("Record to update not found") if the userId from the JWT no longer exists in the database (e.g., user was deleted). This error is not caught in `updateMe` and will bubble up as an unhandled 500 rather than the correct 404. `getMe` (line 58) handles this correctly with `findUnique` + null check.

**Fix:**

```typescript
async updateMe(userId: string, dto: UpdateProfileDto): Promise<UserProfile> {
  // ... build data object ...
  try {
    const user = await this.prisma.user.update({
      where: { id: userId },
      data,
      select: PROFILE_SELECT,
    });
    return user as UserProfile;
  } catch (err) {
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === 'P2025'
    ) {
      throw new NotFoundException(`User ${userId} not found`);
    }
    throw err;
  }
}
```

---

### WR-03: `resend-verification` route uses status 429 for both rate-limit cases — dead ternary

**File:** `apps/web/src/app/api/resend-verification/route.ts:53`
**Issue:** `{ status: result.maxReached ? 429 : 429 }` — the ternary is dead code; both branches return 429. The comment below suggests this was meant to differentiate 429 (cooldown) from 429 (max reached), but both cases produce the same status. This is a code quality issue hiding a likely intent to use 503 or a different status for `maxReached`.

**Fix:** Use a different status for the max-reached case if differentiation is desired, or simplify:

```typescript
status: 429,
```

---

### WR-04: Email templates interpolate `verifyUrl`/`resetUrl` without escaping — potential XSS in email HTML if URL is attacker-controlled

**File:** `apps/web/src/lib/email-templates.tsx:41` and `apps/web/src/lib/email-templates.tsx:107`
**Issue:** Both HTML templates directly interpolate `${verifyUrl}` and `${resetUrl}` into the `href` attribute and as plain text without HTML-escaping. The URLs are constructed server-side from `process.env.NEXTAUTH_URL` + a hardcoded path + the token (a hex string), so in practice the attack surface is limited. However, if `NEXTAUTH_URL` is misconfigured to contain characters like `"`, `<`, or `>`, or if this pattern is copied to user-controlled input in future, it becomes an XSS vector in the email client.

**Fix:** Apply a minimal HTML-escaping function to URLs before interpolation:

```typescript
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}
// Usage:
<a href="${escapeHtml(verifyUrl)}">...</a>
```

---

### WR-05: `getAuthHeaders` in `profile-form.tsx` sends `userId` as Bearer token — incorrect and non-functional

**File:** `apps/web/src/app/(dashboard)/profile/profile-form.tsx:68`
**Issue:** `getAuthHeaders` is defined but constructs `{ Authorization: 'Bearer ${session.user.userId}' }` — a raw UUID, not a JWT. This function is never called in the component (profile fetch uses `/api/profile/me` relay, profile update uses `/api/profile/update` relay), so it does not cause a live bug. However, it is dead misleading code that suggests direct NestJS calls are expected and would fail silently if ever invoked.

**Fix:** Remove the `getAuthHeaders` function entirely since all NestJS calls go through Next.js relay routes.

---

### WR-06: Middleware only protects `/dashboard/:path*` and `/profile/:path*` — `/dashboard` (without trailing path) is unprotected

**File:** `apps/web/src/middleware.ts:19`
**Issue:** The matcher `["/dashboard/:path*", "/profile/:path*"]` uses `:path*` which matches zero or more path segments. In Next.js 14 App Router, `:path*` means "one or more segments after the slash", so `/dashboard` itself (with no trailing segment) does NOT match `/dashboard/:path*`. The exact path `/dashboard` (root dashboard page) is unprotected by the middleware, relying solely on the `DashboardLayout` server component's `redirect('/login')` check. If the layout ever fails to execute (e.g., an error boundary catches it), the middleware would not be a safety net.

**Fix:** Add explicit exact-path matchers:

```typescript
export const config = {
  matcher: ["/dashboard", "/dashboard/:path*", "/profile", "/profile/:path*"],
};
```

---

### WR-07: `createVerificationToken` does not delete previous tokens before inserting — stale tokens accumulate

**File:** `apps/web/src/lib/auth-actions.ts:130`
**Issue:** `createVerificationToken` always inserts a new `VerificationToken` row without deleting existing tokens for the same email. If a user requests multiple verification emails (via the resend flow), multiple valid tokens accumulate in the `VerificationToken` table, all associated with the same `identifier` (email). Any of these tokens will verify the user's email via `verifyEmailToken`'s `findFirst({ where: { token } })`. While the rate limiter bounds the number of resends to 3/hour, old tokens from before the rate limit was in place (or from a different hour window) remain valid for up to 24 hours. This also causes unbounded table growth.

**Fix:** Delete existing tokens for the identifier before creating a new one:

```typescript
export async function createVerificationToken(userId: string, email: string): Promise<string> {
  const token = crypto.randomBytes(32).toString('hex');
  const expires = new Date(Date.now() + 24 * 60 * 60 * 1000);

  // Invalidate any existing verification tokens for this email
  await prisma.verificationToken.deleteMany({ where: { identifier: email } });

  await prisma.verificationToken.create({ data: { identifier: email, token, expires } });
  return token;
}
```

---

### WR-08: `ProfileService` S3 client is constructed with empty-string credentials when env vars are missing

**File:** `apps/api/src/profile/profile.service.ts:42-43`
**Issue:** `accessKeyId` and `secretAccessKey` default to `''` when `MINIO_ACCESS_KEY` / `MINIO_SECRET_KEY` are not set. The S3Client will be constructed successfully with empty credentials and will not fail until a `getSignedUrl` call is attempted, at which point the error may be cryptic. More importantly, empty credentials will generate a presigned URL that MinIO/R2 will reject with an authentication error — but the NestJS endpoint will return this URL to the client as if it were valid, sending the browser on a doomed PUT request with no useful error message.

**Fix:** Throw during service construction if required credentials are missing:

```typescript
constructor(private readonly config: ConfigService) {
  const endpoint = this.config.getOrThrow<string>('MINIO_ENDPOINT');
  const accessKeyId = this.config.getOrThrow<string>('MINIO_ACCESS_KEY');
  const secretAccessKey = this.config.getOrThrow<string>('MINIO_SECRET_KEY');
  this.bucket = this.config.get<string>('MINIO_BUCKET') ?? 'english-learning';
  // ...
}
```

---

### WR-09: `profile-form.tsx` silently swallows save-profile errors — user receives no feedback on failure

**File:** `apps/web/src/app/(dashboard)/profile/profile-form.tsx:111`
**Issue:** In `handleSave`, the `catch` block executes `setToast('')` (which clears any existing toast) and returns without setting an error state. If the PATCH to `/api/profile/update` fails (network error, 401, 500), the user sees the "Save changes" button return to its non-loading state with no indication of what happened. The loading spinner disappears but no error is communicated.

**Fix:**

```typescript
} catch {
  setToast('Failed to save profile. Please try again.');
  setTimeout(() => setToast(''), 4000);
}
```

---

## Info

### IN-01: Duplicate Redis client instances — `auth-actions.ts` and `rate-limit.ts` each create their own connection

**File:** `apps/web/src/lib/auth-actions.ts:29-35` and `apps/web/src/lib/rate-limit.ts:15-22`
**Issue:** Two lazy singleton Redis clients exist: `_redis` in `auth-actions.ts` (used by `checkResendRateLimit`) and `_redis` in `rate-limit.ts` (used by `checkEmailResendRateLimit`). Both connect to the same Redis instance. In a serverless/edge environment (Next.js deployed on Vercel), each cold-start creates separate connections. The exported `checkEmailResendRateLimit` from `rate-limit.ts` is never imported by anything in scope — only the inline `checkResendRateLimit` in `auth-actions.ts` is used.

**Fix:** Remove the duplicate in `auth-actions.ts`. Import and use `checkEmailResendRateLimit` from `rate-limit.ts`.

---

### IN-02: `JwtPayloadSchema` in `auth.types.ts` requires `role` and `cefrLevel` as non-optional — but `jwt` callback allows them to be undefined

**File:** `packages/shared/src/auth.types.ts:7-13` and `apps/web/src/auth.ts:65-66`
**Issue:** `JwtPayloadSchema` defines `role` as `z.enum(["STUDENT", "ADMIN"])` (required) and `cefrLevel` as `z.enum(["B1", "B2", "C1"])` (required). But in the `jwt` callback in `auth.ts`, both are set via `(user as { role?: string }).role` — the `?` means they can be `undefined`. A newly-registered user processed through the Credentials provider may have `role` and `cefrLevel` undefined if the Prisma-returned `user` object doesn't include those fields (depending on what `PrismaAdapter` returns at sign-in). The schema and the runtime behaviour are out of sync.

**Fix:** Add `.optional()` to `role` and `cefrLevel` in `JwtPayloadSchema`, or ensure the jwt callback always provides valid defaults:

```typescript
token.role = (user as { role?: string }).role ?? 'STUDENT';
token.cefrLevel = (user as { cefrLevel?: string }).cefrLevel ?? 'B1';
```

---

### IN-03: `profile/page.tsx` defines a local `API_URL` constant that shadows the exported one from `api-client.ts`

**File:** `apps/web/src/app/(dashboard)/profile/page.tsx:28`
**Issue:** `const API_URL = process.env["NEXT_PUBLIC_API_URL"] ?? "http://localhost:3001"` duplicates the same logic already in `apps/web/src/lib/api-client.ts:18`. The value is identical, but having it in two places risks drift (e.g., if the default port changes). The `fetchProfile` function defined at line 30–41 is also never called — the `ProfilePage` component passes the session to `ProfileForm` but does not call `fetchProfile` server-side (lines 55–62 show no `fetchProfile` invocation). The function is dead code.

**Fix:** Remove `fetchProfile` from `profile/page.tsx` (it is unused) and remove the local `API_URL` constant — import it from `api-client.ts` if needed.

---

### IN-04: `resendVerificationEmail` in `auth-actions.ts` does not call `createVerificationToken` — it accepts a pre-generated token

**File:** `apps/web/src/lib/auth-actions.ts:185-212`
**Issue:** `resendVerificationEmail` calls `createVerificationToken(userId, email)` (line 203) which takes a `userId` parameter but does not actually use it — the function only uses `email` as the `identifier` (line 144). The `userId` parameter in `createVerificationToken` is a dead parameter that adds confusion about what the function requires and makes the API surface misleading.

**Fix:** Remove the `userId` parameter from `createVerificationToken` since it is unused:

```typescript
export async function createVerificationToken(email: string): Promise<string> {
  // userId removed — identifier is the email address per NextAuth VerificationToken convention
```

---

_Reviewed: 2026-06-12T10:00:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
