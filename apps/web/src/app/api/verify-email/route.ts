/**
 * Email verification endpoint — GET /api/verify-email?token=...
 *
 * AUTH-02: Validates the token, sets User.emailVerified, and redirects.
 * T-02-05: Token is deleted after use (no reuse). Expired tokens show error.
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyEmailToken } from '@/lib/auth-actions';

export async function GET(request: NextRequest): Promise<NextResponse> {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get('token');

  if (!token) {
    return NextResponse.redirect(
      new URL('/verify-email?error=missing-token', request.url)
    );
  }

  const result = await verifyEmailToken(token);

  if (!result.success) {
    if (result.expired) {
      // D-03: Expired token — redirect to verify-email page with expired error
      return NextResponse.redirect(
        new URL('/verify-email?error=expired', request.url)
      );
    }
    // Unknown or invalid token
    return NextResponse.redirect(
      new URL('/verify-email?error=invalid', request.url)
    );
  }

  // Success — emailVerified is now set; redirect to login with success message
  return NextResponse.redirect(
    new URL('/login?verified=1', request.url)
  );
}
