'use client';

/**
 * Verify Email page — /verify-email
 *
 * AUTH-02: Check-your-inbox page shown after registration.
 * D-02: Resend button rate-limited 1/60s, max 3/hour.
 * D-03: Expired token shows error with request-new-link option.
 * UI-SPEC: Verify Email Page section.
 *
 * Query params:
 * - ?email=  — the email address to display
 * - ?error=  — error code (not-verified, expired, invalid, missing-token)
 */

import { useEffect, useState, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { resendVerificationEmail } from '@/lib/auth-actions';
import { cn } from '@/lib/utils';

const COOLDOWN_SECONDS = 60;

type PageState = 'check-inbox' | 'max-reached' | 'success' | 'error';

export default function VerifyEmailPage() {
  const searchParams = useSearchParams();
  const email = searchParams.get('email') ?? '';
  const errorCode = searchParams.get('error');

  const [pageState, setPageState] = useState<PageState>(() => {
    if (errorCode === 'expired') return 'error';
    return 'check-inbox';
  });
  const [errorMessage, setErrorMessage] = useState<string>(() => {
    if (errorCode === 'expired') return 'Your verification link has expired. Request a new one below.';
    if (errorCode === 'invalid') return 'Invalid verification token. Please request a new link.';
    if (errorCode === 'missing-token') return 'No verification token found. Please request a new link.';
    return '';
  });

  // Resend state
  const [isResending, setIsResending] = useState(false);
  const [cooldown, setCooldown] = useState(0); // seconds remaining
  const [resendCount, setResendCount] = useState(0);

  // Countdown timer
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => {
      setCooldown((c) => {
        if (c <= 1) {
          clearInterval(timer);
          return 0;
        }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  const handleResend = useCallback(async () => {
    if (!email || isResending || cooldown > 0 || pageState === 'max-reached') return;

    setIsResending(true);
    setErrorMessage('');

    try {
      // We need userId but in this context we only have the email.
      // The resendVerificationEmail action accepts email; it looks up the user.
      // We'll use a client-side POST to a minimal API route that accepts email.
      const response = await fetch('/api/resend-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const data = await response.json() as {
        success: boolean;
        error?: string;
        retryAfter?: number;
        maxReached?: boolean;
      };

      if (data.success) {
        setCooldown(COOLDOWN_SECONDS);
        setResendCount((c) => c + 1);
      } else if (data.maxReached) {
        setPageState('max-reached');
      } else if (data.retryAfter) {
        setCooldown(data.retryAfter);
        setErrorMessage(`Please wait ${data.retryAfter} seconds before requesting another email.`);
      } else {
        setErrorMessage(data.error ?? 'Failed to send email. Please try again.');
      }
    } catch {
      setErrorMessage('Something went wrong. Please try again.');
    } finally {
      setIsResending(false);
    }
  }, [email, isResending, cooldown, pageState]);

  const isResendDisabled = isResending || cooldown > 0 || pageState === 'max-reached';

  return (
    <div className="rounded-xl border border-border bg-card p-8 shadow-sm">
      <h1 className="text-2xl font-semibold text-foreground mb-4">Check your inbox</h1>

      {/* Error state (expired / invalid token) */}
      {(pageState === 'error' || errorMessage) && pageState !== 'max-reached' && (
        <div
          role="alert"
          className="mb-4 rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive"
        >
          {errorMessage}
        </div>
      )}

      {/* Main copy */}
      <p className="text-base text-muted-foreground mb-6">
        {email ? (
          <>
            We sent a verification link to{' '}
            <strong className="font-semibold text-foreground">{email}</strong>. Click the link
            to activate your account.
          </>
        ) : (
          'We sent a verification link to your email address. Click the link to activate your account.'
        )}
      </p>

      <p className="text-sm text-muted-foreground mb-6">
        Didn&apos;t receive the email? Check your spam folder or click below to resend.
      </p>

      {/* Resend state: max reached */}
      {pageState === 'max-reached' ? (
        <p className="text-sm text-muted-foreground">
          Maximum resends reached. Wait 1 hour or{' '}
          <a
            href="mailto:support@yourdomain.com"
            className="font-semibold text-primary underline underline-offset-4"
          >
            contact support
          </a>
          .
        </p>
      ) : (
        <>
          {/* Resend button */}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleResend}
            disabled={isResendDisabled}
            aria-disabled={isResendDisabled}
            className={cn(
              'min-h-[44px]', // accessibility: touch target
              cooldown > 0 && 'cursor-not-allowed'
            )}
          >
            {isResending ? (
              <span className="flex items-center gap-2">
                <svg
                  className="animate-spin h-4 w-4"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Sending...
              </span>
            ) : cooldown > 0 ? (
              // D-02: UI-SPEC — "Resend again in {N}s"
              `Resend again in ${cooldown}s`
            ) : (
              'Resend verification email'
            )}
          </Button>

          {resendCount > 0 && cooldown > 0 && (
            <p className="mt-2 text-sm text-muted-foreground">
              Email resent! Check your inbox.
            </p>
          )}
        </>
      )}

      {/* Back to sign in */}
      <div className="mt-8 pt-6 border-t border-border">
        <p className="text-sm text-muted-foreground">
          Already verified?{' '}
          <Link href="/login" className="font-semibold text-primary underline underline-offset-4">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
