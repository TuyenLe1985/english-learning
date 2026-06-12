/**
 * POST /api/resend-verification
 *
 * Client-facing endpoint for the verify-email page resend button.
 * Looks up the user by email, then calls resendVerificationEmail with userId.
 * Rate-limiting (D-02) is enforced inside resendVerificationEmail via Redis.
 *
 * AUTH-02: Rate-limited resend; 1/60s + max 3/hour.
 * T-02-06: Counters in Redis, survive restarts (Pitfall 5).
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@repo/database';
import { resendVerificationEmail } from '@/lib/auth-actions';

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json() as { email?: string };
    const { email } = body;

    if (!email || typeof email !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Email is required.' },
        { status: 400 }
      );
    }

    // Look up user by email
    const user = await prisma.user.findUnique({
      where: { email: email.trim().toLowerCase() },
      select: { id: true, emailVerified: true },
    });

    if (!user) {
      // Don't reveal whether email exists — return success to prevent enumeration
      return NextResponse.json({ success: true });
    }

    if (user.emailVerified) {
      // Already verified — no need to resend
      return NextResponse.json({ success: true, alreadyVerified: true });
    }

    const result = await resendVerificationEmail(user.id, email.trim().toLowerCase());

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: result.error,
          retryAfter: result.retryAfter,
          maxReached: result.maxReached,
        },
        { status: result.maxReached ? 429 : 429 }
      );
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { success: false, error: 'Internal server error.' },
      { status: 500 }
    );
  }
}
