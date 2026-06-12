'use client';

/**
 * Reset password request page — /reset-password
 * AUTH-04: User enters email to receive a password-reset link.
 * Security T-02-11: Shows identical success copy whether or not the email exists (no enumeration).
 * UI-SPEC: Reset Password Request page — email-only form, enumeration-safe success message.
 */

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { createPasswordResetToken } from '@/lib/auth-actions';
import { cn } from '@/lib/utils';

export default function ResetPasswordPage() {
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  function validate(): boolean {
    if (!email.trim()) {
      setEmailError('Email is required.');
      return false;
    }
    if (!/\S+@\S+\.\S+/.test(email)) {
      setEmailError('Please enter a valid email address.');
      return false;
    }
    return true;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!validate()) return;

    setEmailError('');
    setIsLoading(true);

    try {
      // T-02-11: Server always returns success shape — no enumeration leakage.
      await createPasswordResetToken(email.trim().toLowerCase());
    } catch {
      // Intentionally swallow — never reveal server errors to prevent enumeration.
    } finally {
      setIsLoading(false);
      // Always show the same success message regardless of server outcome.
      setSubmitted(true);
    }
  }

  if (submitted) {
    return (
      <div className="rounded-xl border border-border bg-card p-8 shadow-sm">
        <div className="flex flex-col items-center text-center gap-4">
          {/* Success icon */}
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/20">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-green-600 dark:text-green-400"
              aria-hidden="true"
            >
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>

          <h1 className="text-2xl font-semibold text-foreground">Check your inbox</h1>

          {/* T-02-11: Enumeration-safe copy — identical for registered and unregistered emails */}
          <p className="text-sm text-muted-foreground max-w-sm">
            If that email is registered, a reset link is on its way. Check your inbox and
            follow the instructions to set a new password. The link expires in 24 hours.
          </p>

          <p className="text-sm text-muted-foreground">
            Back to{' '}
            <Link
              href="/login"
              className="font-semibold text-primary hover:underline underline-offset-4"
            >
              Sign in
            </Link>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-card p-8 shadow-sm">
      <h1 className="text-2xl font-semibold text-foreground mb-2">Reset your password</h1>
      <p className="text-sm text-muted-foreground mb-6">
        Enter the email address you registered with and we&rsquo;ll send you a reset link.
      </p>

      <form onSubmit={handleSubmit} noValidate>
        {/* Email */}
        <div className="mb-6">
          <label
            htmlFor="email"
            className="block text-sm font-semibold text-foreground mb-1.5"
          >
            Email
          </label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              if (emailError) setEmailError('');
            }}
            aria-describedby={emailError ? 'email-error' : undefined}
            aria-invalid={!!emailError}
            disabled={isLoading}
            className={cn(
              'w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground',
              'outline-none transition-colors focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50',
              'disabled:opacity-50 disabled:cursor-not-allowed',
              emailError && 'border-destructive focus-visible:border-destructive focus-visible:ring-destructive/20'
            )}
            placeholder="you@example.com"
          />
          {emailError && (
            <p id="email-error" className="mt-1.5 text-sm text-destructive">
              {emailError}
            </p>
          )}
        </div>

        {/* Submit */}
        <Button
          type="submit"
          variant="default"
          className="w-full"
          disabled={isLoading}
          aria-disabled={isLoading}
        >
          {isLoading ? (
            <span className="flex items-center gap-2">
              <svg
                className="animate-spin h-4 w-4"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                />
              </svg>
              Sending reset link...
            </span>
          ) : (
            'Send reset link'
          )}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        Remembered your password?{' '}
        <Link
          href="/login"
          className="font-semibold text-primary hover:underline underline-offset-4"
        >
          Sign in
        </Link>
      </p>
    </div>
  );
}
