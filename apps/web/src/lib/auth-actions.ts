'use server';

/**
 * Auth server actions — registration, email verification, rate-limited resend.
 *
 * Implements: AUTH-01 (email/password registration with bcrypt), AUTH-02 (email verification gate)
 * Security: T-02-04 (bcrypt 12 rounds), T-02-05 (token expiry+delete), T-02-06 (Redis rate-limit)
 *
 * D-15 responsibility split: NextAuth (Next.js) owns signup/email-verification; NestJS owns /api/users/me.
 * D-04: Email sent via Resend SDK (RESEND_API_KEY in apps/web env).
 * Pitfall 5: Rate-limit counters stored in Redis (REDIS_URL_CACHE), not in-memory.
 * Pitfall 6: Resend SDK never throws — always check { error } destructure.
 */

import crypto from 'crypto';
import bcrypt from 'bcrypt';
import { prisma } from '@repo/database';
import { Resend } from 'resend';
import {
  verificationEmailHtml,
  verificationEmailText,
  passwordResetEmailHtml,
  passwordResetEmailText,
} from './email-templates';
// CR-04 fix: removed duplicate Redis client — import the shared singleton from
// rate-limit.ts to avoid two connections to the same Redis instance.
import {
  checkEmailResendRateLimit,
  checkPasswordResetRateLimit,
} from './rate-limit';

// ─── Resend client (D-04) ─────────────────────────────────────────────────────
// Lazily instantiated — RESEND_API_KEY may not be set in test environments.
let _resend: Resend | null = null;

function getResend(): Resend {
  if (!_resend) {
    _resend = new Resend(process.env.RESEND_API_KEY);
  }
  return _resend;
}

// ─── Types ────────────────────────────────────────────────────────────────────

export type RegisterResult =
  | { success: true; userId: string }
  | { success: false; error: string };

export type VerifyEmailResult =
  | { success: true }
  | { success: false; expired?: boolean; error: string };

export type PasswordResetRequestResult = { success: true } | { success: false; error: string };

export type ResetPasswordResult =
  | { success: true }
  | { success: false; expired?: boolean; error: string };

// ─── registerUser ─────────────────────────────────────────────────────────────

/**
 * Register a new user with email and password.
 *
 * Validates:
 * - password >= 8 characters (T-02-04)
 * - email not already registered
 *
 * Creates the user with:
 * - passwordHash = bcrypt.hash(password, 12) — never stores plaintext (T-02-04)
 * - emailVerified = null — Credentials users must verify (D-01)
 */
export async function registerUser(input: {
  name: string;
  email: string;
  password: string;
}): Promise<RegisterResult> {
  const { name, email, password } = input;

  // Input validation
  if (!password || password.length < 8) {
    return {
      success: false,
      error: 'Password must be at least 8 characters.',
    };
  }

  // Duplicate email check
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return {
      success: false,
      error: 'An account with this email already exists. Sign in instead.',
    };
  }

  // Hash password — 12 rounds per CLAUDE.md security spec (T-02-04)
  const passwordHash = await bcrypt.hash(password, 12);

  // Create user — emailVerified null (Credentials users must verify, D-01)
  const user = await prisma.user.create({
    data: {
      name,
      email,
      passwordHash,
      emailVerified: null,
    },
  });

  return { success: true, userId: user.id };
}

// ─── createVerificationToken ──────────────────────────────────────────────────

/**
 * Create a cryptographically random verification token for the user.
 * Expires in 24 hours (D-03).
 * Token is stored in the VerificationToken table (reuses NextAuth-compatible table).
 * Pattern: RESEARCH.md Pattern 5 (crypto.randomBytes hex token).
 */
export async function createVerificationToken(
  userId: string,
  email: string
): Promise<string> {
  // Generate a 32-byte random hex token (256-bit entropy)
  const token = crypto.randomBytes(32).toString('hex');
  const expires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24h (D-03)

  // WR-07: Invalidate any existing email-verification tokens for this address
  // before creating a new one. Without this, every resend (up to 3/hour) adds
  // an additional row — old tokens remain valid for up to 24h and the table
  // grows unbounded. deleteMany is safe: email is the identifier, so we only
  // touch this user's tokens.
  await prisma.verificationToken.deleteMany({
    where: { identifier: email },
  });

  await prisma.verificationToken.create({
    data: {
      identifier: email,
      token,
      expires,
    },
  });

  return token;
}

// ─── sendVerificationEmail ────────────────────────────────────────────────────

/**
 * Send a verification email with the given token via Resend SDK.
 * Pitfall 6: SDK never throws — always check the error field.
 */
export async function sendVerificationEmail(
  email: string,
  token: string
): Promise<void> {
  const baseUrl = process.env.NEXTAUTH_URL ?? 'http://localhost:3000';
  const verifyUrl = `${baseUrl}/api/verify-email?token=${token}`;

  const resend = getResend();
  const { error } = await resend.emails.send({
    from: process.env.EMAIL_FROM ?? 'noreply@yourdomain.com',
    to: email,
    subject: 'Verify your email address — English Learning',
    html: verificationEmailHtml({ verifyUrl }),
    text: verificationEmailText({ verifyUrl }),
  });

  // Pitfall 6: Resend SDK never throws; check error explicitly
  if (error) {
    throw new Error(
      `Failed to send verification email: ${(error as { message?: string }).message ?? String(error)}`
    );
  }
}

// ─── resendVerificationEmail ──────────────────────────────────────────────────

/**
 * Resend verification email with rate-limit enforcement (D-02).
 * Rate limits checked before creating a new token.
 */
export async function resendVerificationEmail(
  userId: string,
  email: string
): Promise<{ success: boolean; error?: string; retryAfter?: number; maxReached?: boolean }> {
  // CR-04 fix: use the atomic rate-limit check from rate-limit.ts
  const rateLimitResult = await checkEmailResendRateLimit(userId);

  if (!rateLimitResult.allowed) {
    return {
      success: false,
      error: rateLimitResult.maxReached
        ? 'Maximum resends reached. Wait 1 hour or contact support.'
        : `Please wait before requesting another email.`,
      retryAfter: (rateLimitResult as { retryAfter?: number }).retryAfter,
      maxReached: rateLimitResult.maxReached,
    };
  }

  try {
    const token = await createVerificationToken(userId, email);
    await sendVerificationEmail(email, token);
    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to send email.',
    };
  }
}

// ─── createPasswordResetToken ─────────────────────────────────────────────────

/**
 * Request a password reset link for the given email.
 *
 * Security (T-02-11): Returns the same success-shaped response whether or not the email
 * exists — never reveals account existence to the caller (no enumeration).
 *
 * When the user exists:
 * - Upserts a VerificationToken with identifier `password-reset:{userId}`, random token,
 *   expires now+24h (D-03).
 * - Sends the reset link via Resend (Pitfall 6: always check { error }).
 *
 * Pattern: RESEARCH.md Pattern 5
 */
export async function createPasswordResetToken(
  email: string
): Promise<PasswordResetRequestResult> {
  // CR-05: Apply rate limit BEFORE the DB lookup to prevent email flooding and
  // to avoid leaking account-existence timing differences.
  // Always return success shape (T-02-11) even when rate-limited — prevents
  // an attacker from inferring account existence via 429 vs 200 response.
  const rateLimitResult = await checkPasswordResetRateLimit(email.toLowerCase());
  if (!rateLimitResult.allowed) {
    return { success: true };
  }

  const user = await prisma.user.findUnique({ where: { email } });

  // T-02-11: Return the same response shape regardless of whether user exists.
  if (!user) {
    return { success: true };
  }

  // Generate a 32-byte random hex token (256-bit entropy)
  const token = crypto.randomBytes(32).toString('hex');
  const expires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24h (D-03)
  const identifier = `password-reset:${user.id}`;

  // CR-02 fix: the original upsert used the new random token in WHERE
  // (always a miss → always creates duplicates, never updates).
  // Replace with deleteMany + create: atomically ensures only one active
  // reset token exists per user — the old one is invalidated on new request.
  await prisma.verificationToken.deleteMany({ where: { identifier } });
  await prisma.verificationToken.create({
    data: { identifier, token, expires },
  });

  // Send reset email via Resend (Pitfall 6: never throws — check error)
  const baseUrl = process.env.NEXTAUTH_URL ?? 'http://localhost:3000';
  const resetUrl = `${baseUrl}/reset-password/confirm?token=${token}`;

  const resend = getResend();
  const { error } = await resend.emails.send({
    from: process.env.EMAIL_FROM ?? 'noreply@yourdomain.com',
    to: email,
    subject: 'Reset your password — English Learning',
    html: passwordResetEmailHtml({ resetUrl }),
    text: passwordResetEmailText({ resetUrl }),
  });

  // Pitfall 6: check error but DO NOT leak email-send failure to the caller
  // (would expose whether the email was deliverable → information disclosure)
  if (error) {
    // Log server-side only; caller still receives success shape (T-02-11)
    console.error(
      `[createPasswordResetToken] Resend error for ${email}:`,
      (error as { message?: string }).message ?? String(error)
    );
  }

  return { success: true };
}

// ─── resetPassword ────────────────────────────────────────────────────────────

/**
 * Set a new password using a valid reset token.
 *
 * Security (T-02-12):
 * - Rejects newPassword < 8 characters.
 * - Rejects unknown tokens.
 * - Rejects expired tokens (returns expired: true so the UI can show request-new-link).
 * - Deletes the token after use — single-use only.
 * - Stores bcrypt(newPassword, 12) — never plaintext.
 */
export async function resetPassword(
  token: string,
  newPassword: string
): Promise<ResetPasswordResult> {
  // Validate new password length
  if (!newPassword || newPassword.length < 8) {
    return {
      success: false,
      error: 'Password must be at least 8 characters.',
    };
  }

  // CR-08: Reject email-verification tokens submitted to the reset endpoint.
  // Email-verification identifiers are plain email addresses (no prefix).
  // CR-03: Wrap the lookup + delete + update in a transaction to eliminate the
  // TOCTOU race where two concurrent requests both pass findFirst before either
  // delete executes. The atomic delete acts as a compare-and-delete; if a
  // concurrent request already consumed the token, the delete throws and we
  // return an error rather than resetting the password twice.
  return prisma.$transaction(async (tx) => {
    const record = await tx.verificationToken.findFirst({
      where: { token },
    });

    if (!record) {
      return { success: false, error: 'Invalid or unknown reset token.' };
    }

    // CR-08: Guard — password-reset tokens must have the expected identifier prefix.
    if (!record.identifier.startsWith('password-reset:')) {
      return { success: false, error: 'Invalid reset token.' };
    }

    // Check expiry (D-03, T-02-12)
    if (record.expires < new Date()) {
      return {
        success: false,
        expired: true,
        error: 'Your reset link has expired. Request a new one.',
      };
    }

    // CR-03: Delete token atomically BEFORE updating password.
    // If a concurrent request already deleted it this throws, preventing double-reset.
    try {
      await tx.verificationToken.delete({
        where: {
          identifier_token: {
            identifier: record.identifier,
            token: record.token,
          },
        },
      });
    } catch {
      return { success: false, error: 'Invalid or unknown reset token.' };
    }

    // Extract userId from identifier pattern "password-reset:{userId}"
    const userId = record.identifier.replace('password-reset:', '');

    // Hash the new password — 12 rounds (T-02-04)
    // Note: bcrypt.hash is CPU-bound and cannot be run inside a Prisma interactive
    // transaction without blocking the DB connection pool. We hash after the delete
    // so the token is invalidated regardless of hash timing.
    const passwordHash = await bcrypt.hash(newPassword, 12);

    // Update user's password
    await tx.user.update({
      where: { id: userId },
      data: { passwordHash },
    });

    return { success: true };
  });
}

// ─── verifyEmailToken ─────────────────────────────────────────────────────────

/**
 * Validate an email verification token and set emailVerified on the user.
 * T-02-05: expired token returns error with request-new-link option.
 * T-02-05: token is deleted after use to prevent reuse.
 * T-02-05: unknown tokens are rejected.
 */
export async function verifyEmailToken(token: string): Promise<VerifyEmailResult> {
  // CR-03: Wrap the entire lookup + delete + update in a transaction to eliminate
  // the TOCTOU race where two concurrent requests both pass findFirst before either
  // delete executes. The atomic delete acts as a compare-and-delete; if a concurrent
  // request already consumed the token, the delete throws P2025 and we return error.
  // CR-08: Reject password-reset tokens submitted to the email-verify endpoint.
  return prisma.$transaction(async (tx) => {
    const record = await tx.verificationToken.findFirst({
      where: { token },
    });

    if (!record) {
      return { success: false, error: 'Invalid or unknown verification token.' };
    }

    // CR-08: Guard — email-verification tokens must NOT have the password-reset prefix.
    if (record.identifier.startsWith('password-reset:')) {
      return { success: false, error: 'Invalid verification token.' };
    }

    // Check expiry (D-03, T-02-05)
    if (record.expires < new Date()) {
      return {
        success: false,
        expired: true,
        error: 'Your verification link has expired. Request a new one below.',
      };
    }

    // CR-03: Delete token atomically BEFORE updating the user.
    // If a concurrent request already deleted it this throws P2025, preventing
    // the emailVerified update from running a second time.
    try {
      await tx.verificationToken.delete({
        where: { identifier_token: { identifier: record.identifier, token: record.token } },
      });
    } catch {
      return { success: false, error: 'Invalid or unknown verification token.' };
    }

    // Find the user by identifier (email)
    const user = await tx.user.findUnique({
      where: { email: record.identifier },
    });

    if (!user) {
      return { success: false, error: 'User not found.' };
    }

    // Set emailVerified (T-02-05)
    await tx.user.update({
      where: { id: user.id },
      data: { emailVerified: new Date() },
    });

    return { success: true };
  });
}
