'use client';

/**
 * Reset password confirm page — /reset-password/confirm?token=<token>
 * AUTH-04: User sets a new password using the token from the reset email.
 * D-03: Shows an expired-token Alert with "Request new reset link" when token is expired.
 * UI-SPEC: Reset Password Confirm page — new + confirm password fields, expired-token alert.
 */

import { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { resetPassword } from '@/lib/auth-actions';
import { cn } from '@/lib/utils';

function ResetPasswordConfirmContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token') ?? '';

  const [form, setForm] = useState({ password: '', confirmPassword: '' });
  const [errors, setErrors] = useState<{ password?: string; confirmPassword?: string; form?: string }>({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isExpired, setIsExpired] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [missingToken, setMissingToken] = useState(false);

  useEffect(() => {
    if (!token) {
      setMissingToken(true);
    }
  }, [token]);

  function validate(): boolean {
    const e: typeof errors = {};
    if (!form.password || form.password.length < 8) {
      e.password = 'Password must be at least 8 characters.';
    }
    if (form.password !== form.confirmPassword) {
      e.confirmPassword = 'Passwords do not match.';
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;

    setErrors({});
    setIsLoading(true);

    try {
      const result = await resetPassword(token, form.password);

      if (!result.success) {
        if (result.expired) {
          setIsExpired(true);
          return;
        }
        setErrors({ form: result.error });
        return;
      }

      setIsSuccess(true);
    } catch {
      setErrors({ form: 'Something went wrong. Please try again.' });
    } finally {
      setIsLoading(false);
    }
  }

  // Missing token in URL — redirect to request page
  if (missingToken) {
    return (
      <div className="rounded-xl border border-border bg-card p-8 shadow-sm">
        <div className="flex flex-col items-center text-center gap-4">
          <h1 className="text-2xl font-semibold text-foreground">Invalid reset link</h1>
          <p className="text-sm text-muted-foreground max-w-sm">
            This reset link is missing a token. Please request a new one.
          </p>
          <Link href="/reset-password">
            <Button variant="default">Request new reset link</Button>
          </Link>
        </div>
      </div>
    );
  }

  // Expired token — show destructive Alert with request-new-link option
  if (isExpired) {
    return (
      <div className="rounded-xl border border-border bg-card p-8 shadow-sm">
        <div
          role="alert"
          className="rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-4 text-sm text-destructive mb-6"
        >
          <p className="font-semibold mb-1">This reset link has expired.</p>
          <p>
            Password reset links expire after 24 hours. Please request a new one to continue.
          </p>
        </div>
        <Link href="/reset-password">
          <Button variant="default" className="w-full">
            Request new reset link
          </Button>
        </Link>
        <p className="mt-4 text-center text-sm text-muted-foreground">
          Back to{' '}
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

  // Success state
  if (isSuccess) {
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

          <h1 className="text-2xl font-semibold text-foreground">Password updated</h1>

          <p className="text-sm text-muted-foreground max-w-sm">
            Your password has been updated. Sign in with your new password.
          </p>

          <Button
            variant="default"
            className="w-full"
            onClick={() => router.push('/login')}
          >
            Go to sign in
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-card p-8 shadow-sm">
      <h1 className="text-2xl font-semibold text-foreground mb-2">Set new password</h1>
      <p className="text-sm text-muted-foreground mb-6">
        Choose a strong password with at least 8 characters.
      </p>

      {/* Form-level error */}
      {errors.form && (
        <div
          role="alert"
          className="mb-4 rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive"
        >
          {errors.form}
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate>
        {/* New password */}
        <div className="mb-4">
          <label
            htmlFor="password"
            className="block text-sm font-semibold text-foreground mb-1.5"
          >
            New password
          </label>
          <div className="relative">
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="new-password"
              value={form.password}
              onChange={(e) => {
                setForm((f) => ({ ...f, password: e.target.value }));
                if (errors.password) setErrors((err) => ({ ...err, password: undefined }));
              }}
              aria-describedby={errors.password ? 'password-error' : undefined}
              aria-invalid={!!errors.password}
              disabled={isLoading}
              className={cn(
                'w-full rounded-lg border border-border bg-background px-3 py-2 pr-10 text-sm text-foreground placeholder:text-muted-foreground',
                'outline-none transition-colors focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50',
                'disabled:opacity-50 disabled:cursor-not-allowed',
                errors.password &&
                  'border-destructive focus-visible:border-destructive focus-visible:ring-destructive/20'
              )}
              placeholder="At least 8 characters"
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
            >
              {showPassword ? (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                  <line x1="1" y1="1" x2="23" y2="23" />
                </svg>
              ) : (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
              )}
            </button>
          </div>
          {errors.password && (
            <p id="password-error" className="mt-1.5 text-sm text-destructive">
              {errors.password}
            </p>
          )}
        </div>

        {/* Confirm new password */}
        <div className="mb-6">
          <label
            htmlFor="confirmPassword"
            className="block text-sm font-semibold text-foreground mb-1.5"
          >
            Confirm new password
          </label>
          <div className="relative">
            <input
              id="confirmPassword"
              type={showConfirmPassword ? 'text' : 'password'}
              autoComplete="new-password"
              value={form.confirmPassword}
              onChange={(e) => {
                setForm((f) => ({ ...f, confirmPassword: e.target.value }));
                if (errors.confirmPassword) setErrors((err) => ({ ...err, confirmPassword: undefined }));
              }}
              aria-describedby={errors.confirmPassword ? 'confirm-password-error' : undefined}
              aria-invalid={!!errors.confirmPassword}
              disabled={isLoading}
              className={cn(
                'w-full rounded-lg border border-border bg-background px-3 py-2 pr-10 text-sm text-foreground placeholder:text-muted-foreground',
                'outline-none transition-colors focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50',
                'disabled:opacity-50 disabled:cursor-not-allowed',
                errors.confirmPassword &&
                  'border-destructive focus-visible:border-destructive focus-visible:ring-destructive/20'
              )}
              placeholder="Repeat your new password"
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword((v) => !v)}
              aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
            >
              {showConfirmPassword ? (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                  <line x1="1" y1="1" x2="23" y2="23" />
                </svg>
              ) : (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
              )}
            </button>
          </div>
          {errors.confirmPassword && (
            <p id="confirm-password-error" className="mt-1.5 text-sm text-destructive">
              {errors.confirmPassword}
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
              Updating password...
            </span>
          ) : (
            'Update password'
          )}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        Back to{' '}
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

export default function ResetPasswordConfirmPage() {
  return (
    <Suspense>
      <ResetPasswordConfirmContent />
    </Suspense>
  );
}
