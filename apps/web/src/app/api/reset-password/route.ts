/**
 * POST /api/reset-password — validate reset token and set new password.
 * AUTH-04: API route backing the reset-password confirm flow.
 *
 * This route is an alternative entry point to the server action.
 * Security:
 * - T-02-12: Validates token presence and expiry; deletes token on success (single-use).
 * - Rate-limiting is handled at the Credentials sign-in level by NextAuth; this endpoint
 *   is protected by the token's uniqueness (brute-force on a 256-bit random hex is infeasible).
 */

import { NextRequest, NextResponse } from 'next/server';
import { resetPassword } from '@/lib/auth-actions';

export async function POST(req: NextRequest) {
  let token: string;
  let password: string;

  try {
    const body = (await req.json()) as { token?: unknown; password?: unknown };
    token = typeof body.token === 'string' ? body.token : '';
    password = typeof body.password === 'string' ? body.password : '';
  } catch {
    return NextResponse.json(
      { success: false, error: 'Invalid request body.' },
      { status: 400 }
    );
  }

  if (!token) {
    return NextResponse.json(
      { success: false, error: 'Reset token is required.' },
      { status: 400 }
    );
  }

  const result = await resetPassword(token, password);

  if (!result.success) {
    const status = result.expired ? 410 : 400; // 410 Gone for expired tokens
    return NextResponse.json(result, { status });
  }

  return NextResponse.json(result, { status: 200 });
}
