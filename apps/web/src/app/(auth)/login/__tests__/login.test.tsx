/**
 * Login page tests — covers the LoginForm client component.
 *
 * AUTH-05: sign-in with credentials
 * AUTH-06: redirect to /dashboard on success
 * UI-SPEC: error alert text, Google button, forgot-password link, register link
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';

// Mock next-auth/react so signIn does not throw in jsdom
vi.mock('next-auth/react', () => ({
  signIn: vi.fn().mockResolvedValue({ ok: true, error: null }),
}));

// Mock next/navigation so redirect() / useRouter() / useSearchParams() don't throw
vi.mock('next/navigation', () => ({
  redirect: vi.fn(),
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }),
  useSearchParams: () => ({
    get: (_key: string) => null,
  }),
}));

async function importLoginForm() {
  const mod = await import('../LoginForm');
  return mod.default;
}

describe('LoginForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it('renders the page title "Sign in to your account"', async () => {
    const LoginForm = await importLoginForm();
    render(<LoginForm />);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Sign in to your account');
  });

  it('renders email input', async () => {
    const LoginForm = await importLoginForm();
    render(<LoginForm />);
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
  });

  it('renders password input', async () => {
    const LoginForm = await importLoginForm();
    render(<LoginForm />);
    expect(screen.getByLabelText(/^password$/i)).toBeInTheDocument();
  });

  it('renders a "Sign in" submit button', async () => {
    const LoginForm = await importLoginForm();
    render(<LoginForm />);
    // Get submit button (type="submit")
    const submitBtn = screen.getByRole('button', { name: /^sign in$/i });
    expect(submitBtn).toBeInTheDocument();
  });

  it('renders "Continue with Google" button', async () => {
    const LoginForm = await importLoginForm();
    render(<LoginForm />);
    expect(screen.getByRole('button', { name: /continue with google/i })).toBeInTheDocument();
  });

  it('renders "Forgot password?" link pointing to /reset-password', async () => {
    const LoginForm = await importLoginForm();
    render(<LoginForm />);
    const link = screen.getByRole('link', { name: /forgot password/i });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute('href', '/reset-password');
  });

  it('renders "Register" link pointing to /register', async () => {
    const LoginForm = await importLoginForm();
    render(<LoginForm />);
    const link = screen.getByRole('link', { name: /register/i });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute('href', '/register');
  });

  it('shows error alert with correct copy when ?error=CredentialsSignin query param is present', async () => {
    vi.doMock('next/navigation', () => ({
      redirect: vi.fn(),
      useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }),
      useSearchParams: () => ({
        get: (key: string) => {
          if (key === 'error') return 'CredentialsSignin';
          return null;
        },
      }),
    }));

    const { default: LoginFormWithError } = await import('../LoginForm');
    render(<LoginFormWithError />);

    const alert = screen.getByRole('alert');
    expect(alert).toBeInTheDocument();
    expect(alert.textContent).toContain('Incorrect email or password');
    expect(alert.textContent).toContain('reset your password');
  });
});
