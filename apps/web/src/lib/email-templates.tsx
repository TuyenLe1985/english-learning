/**
 * Email templates for the English Learning Platform.
 * These are HTML templates used by Resend to send transactional emails.
 *
 * AUTH-02: Email verification template (sent after registration)
 */

// ─── Verification email ────────────────────────────────────────────────────────

export interface VerificationEmailProps {
  verifyUrl: string;
  email?: string;
}

/**
 * Returns HTML string for the verification email.
 * Used in auth-actions.ts sendVerificationEmail().
 */
export function verificationEmailHtml({ verifyUrl }: VerificationEmailProps): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Verify your email address</title>
</head>
<body style="font-family: system-ui, -apple-system, 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px; color: #18181b; background-color: #ffffff;">
  <div style="text-align: center; margin-bottom: 32px;">
    <span style="font-size: 20px; font-weight: 600; color: #18181b;">English Learning</span>
  </div>

  <div style="background-color: #f4f4f5; border-radius: 12px; padding: 32px;">
    <h1 style="font-size: 24px; font-weight: 600; margin: 0 0 16px 0; color: #18181b;">
      Verify your email address
    </h1>
    <p style="font-size: 16px; line-height: 1.5; margin: 0 0 24px 0; color: #52525b;">
      Welcome to English Learning! Click the button below to verify your email address
      and activate your account. This link expires in <strong>24 hours</strong>.
    </p>
    <div style="text-align: center; margin-bottom: 24px;">
      <a href="${verifyUrl}"
         style="display: inline-block; background-color: #18181b; color: #ffffff; text-decoration: none;
                padding: 12px 32px; border-radius: 8px; font-size: 14px; font-weight: 600;">
        Verify email address
      </a>
    </div>
    <p style="font-size: 13px; color: #71717a; margin: 0; text-align: center;">
      If the button does not work, paste this link in your browser:
    </p>
    <p style="font-size: 12px; color: #a1a1aa; margin: 8px 0 0 0; text-align: center; word-break: break-all;">
      ${verifyUrl}
    </p>
  </div>

  <p style="font-size: 13px; color: #a1a1aa; text-align: center; margin-top: 24px;">
    If you did not create an account on English Learning, you can safely ignore this email.
  </p>
</body>
</html>`;
}

export function verificationEmailText({ verifyUrl }: VerificationEmailProps): string {
  return `English Learning — Verify your email address

Welcome! Click the link below to verify your email and activate your account.
This link expires in 24 hours.

${verifyUrl}

If you did not create an account, you can safely ignore this email.`;
}
