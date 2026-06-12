'use client';

/**
 * Login page — /login
 *
 * AUTH-05: Verified user can sign in with email/password and land on /dashboard.
 * AUTH-06: Session persists across refresh/new-tab via 30-day JWT cookie.
 * UI-SPEC: Login Page section — card with email/password fields, Google OAuth, forgot-password, register link.
 * D-01: Unverified users are shown an error; they cannot reach the dashboard.
 * Routing contract: authenticated users visiting /login are redirected to /dashboard (server-side).
 *
 * Server-side redirect for authenticated users is handled in a separate server wrapper.
 * This client component handles the interactive sign-in form.
 */

import { useState } from 'react';
import Link from 'next/link';
import { signIn } from 'next-auth/react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface FormState {
  email: string;
  password: string;
}

interface FormErrors {
  email?: string;
  password?: string;
  form?: string;
}

// Map NextAuth error codes to user-friendly messages (UI-SPEC Copywriting Contract)
function getErrorMessage(error: string | null): string | null {
  if (!error) return null;
  // UI-SPEC exact copy for invalid credentials
  if (error === 'CredentialsSignin' || error === 'credentials') {
    return 'Incorrect email or password. Try again or reset your password.';
  }
  // D-01: Email verification gate error
  if (error === 'email-not-verified') {
    return 'Please verify your email before signing in. Check your inbox.';
  }
  // Generic auth error
  return 'Sign in failed. Please try again.';
}

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const errorParam = searchParams.get('error');

  const [form, setForm] = useState<FormState>({ email: '', password: '' });
  const [errors, setErrors] = useState<FormErrors>({});
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  // Error from URL param (e.g. after NextAuth redirect on failure)
  const urlError = getErrorMessage(errorParam);

  function validate(): FormErrors {
    const e: FormErrors = {};
    if (!form.email.trim()) e.email = 'Email is required.';
    if (!form.password) e.password = 'Password is required.';
    return e;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const validationErrors = validate();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setErrors({});
    setIsLoading(true);

    try {
      // signIn with redirect:false so we can handle the result here
      const result = await signIn('credentials', {
        email: form.email.trim().toLowerCase(),
        password: form.password,
        redirect: false,
      });

      if (!result) {
        setErrors({ form: 'Something went wrong. Please try again.' });
        return;
      }

      if (result.error) {
        // Map error codes to UI messages
        const msg = getErrorMessage(result.error) ??
          'Incorrect email or password. Try again or reset your password.';
        setErrors({ form: msg });
        return;
      }

      // Success — navigate to dashboard
      router.push('/dashboard');
      router.refresh();
    } catch {
      setErrors({ form: 'Something went wrong. Please try again.' });
    } finally {
      setIsLoading(false);
    }
  }

  async function handleGoogleSignIn() {
    setIsGoogleLoading(true);
    try {
      // Google OAuth — full OAuth flow (provider configured in Plan 01; validated in Plan 05)
      await signIn('google', { callbackUrl: '/dashboard' });
    } finally {
      setIsGoogleLoading(false);
    }
  }

  // Combine URL error and form error (URL error shown above fields, form error on submit)
  const displayError = errors.form ?? urlError;

  return (
    <div className="rounded-xl border border-border bg-card p-8 shadow-sm">
      <h1 className="text-2xl font-semibold text-foreground mb-6">Sign in to your account</h1>

      {/* Destructive Alert on auth failure — UI-SPEC: shown above fields */}
      {displayError && (
        <div
          role="alert"
          className="mb-4 rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive"
          aria-live="polite"
        >
          {displayError}
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate>
        {/* Email field */}
        <div className="mb-4">
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
            value={form.email}
            onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
            aria-describedby={errors.email ? 'email-error' : undefined}
            aria-invalid={!!errors.email}
            disabled={isLoading}
            className={cn(
              'w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground',
              'outline-none transition-colors focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50',
              'disabled:opacity-50 disabled:cursor-not-allowed',
              errors.email && 'border-destructive focus-visible:border-destructive focus-visible:ring-destructive/20'
            )}
            placeholder="you@example.com"
          />
          {errors.email && (
            <p id="email-error" className="mt-1.5 text-sm text-destructive">
              {errors.email}
            </p>
          )}
        </div>

        {/* Password field with show/hide toggle (Accessibility contract) */}
        <div className="mb-1.5">
          <label
            htmlFor="password"
            className="block text-sm font-semibold text-foreground mb-1.5"
          >
            Password
          </label>
          <div className="relative">
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              value={form.password}
              onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
              aria-describedby={errors.password ? 'password-error' : undefined}
              aria-invalid={!!errors.password}
              disabled={isLoading}
              className={cn(
                'w-full rounded-lg border border-border bg-background px-3 py-2 pr-10 text-sm text-foreground placeholder:text-muted-foreground',
                'outline-none transition-colors focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50',
                'disabled:opacity-50 disabled:cursor-not-allowed',
                errors.password && 'border-destructive focus-visible:border-destructive focus-visible:ring-destructive/20'
              )}
              placeholder="Your password"
            />
            {/* Password show/hide toggle — aria-label per Accessibility contract */}
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
            >
              {showPassword ? (
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                  <line x1="1" y1="1" x2="23" y2="23" />
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
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

        {/* "Forgot password?" — right-aligned below password field (UI-SPEC) */}
        <div className="flex justify-end mb-6">
          <Link
            href="/reset-password"
            className="text-sm font-medium text-primary hover:underline underline-offset-4"
          >
            Forgot password?
          </Link>
        </div>

        {/* Primary CTA — "Sign in" (full-width, loading state) */}
        <Button
          type="submit"
          variant="default"
          className="w-full"
          disabled={isLoading}
          aria-disabled={isLoading}
          aria-label={isLoading ? 'Signing in...' : undefined}
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
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Signing in...
            </span>
          ) : (
            'Sign in'
          )}
        </Button>
      </form>

      {/* Divider with "or" label (UI-SPEC) */}
      <div className="relative my-6">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-border" />
        </div>
        <div className="relative flex justify-center text-sm">
          <span className="bg-card px-2 text-muted-foreground">or</span>
        </div>
      </div>

      {/* Google OAuth button — "Continue with Google" (UI-SPEC; full OAuth in Plan 05) */}
      <Button
        type="button"
        variant="outline"
        className="w-full"
        onClick={handleGoogleSignIn}
        disabled={isGoogleLoading}
        aria-label="Continue with Google"
      >
        {isGoogleLoading ? (
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
        ) : (
          <>
            {/* Google icon (inline SVG — no external dependency) */}
            <svg role="img" viewBox="0 0 24 24" className="h-4 w-4 mr-2" aria-hidden="true">
              <path
                d="M12.48 10.92v3.28h7.84c-.24 1.84-.853 3.187-1.787 4.133-1.147 1.147-2.933 2.4-6.053 2.4-4.827 0-8.6-3.893-8.6-8.72s3.773-8.72 8.6-8.72c2.6 0 4.507 1.027 5.907 2.347l2.307-2.307C18.747 1.44 16.133 0 12.48 0 5.867 0 .307 5.387.307 12s5.56 12 12.173 12c3.573 0 6.267-1.173 8.373-3.36 2.16-2.16 2.84-5.213 2.84-7.667 0-.76-.053-1.467-.173-2.053H12.48z"
                fill="currentColor"
              />
            </svg>
            Continue with Google
          </>
        )}
      </Button>

      {/* Footer — register link (UI-SPEC) */}
      <p className="mt-6 text-center text-sm text-muted-foreground">
        Don&apos;t have an account?{' '}
        <Link href="/register" className="font-semibold text-primary hover:underline underline-offset-4">
          Register
        </Link>
      </p>
    </div>
  );
}
