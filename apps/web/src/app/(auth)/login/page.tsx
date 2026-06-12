/**
 * Login page server component — /login
 *
 * Server-side auth guard: if a session already exists, redirect to /dashboard.
 * This implements the routing contract: "authenticated users visiting /login are
 * redirected to /dashboard" (AUTH-05, UI-SPEC Routing Contract).
 *
 * The interactive login form is in LoginForm.tsx (client component).
 */

import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import LoginForm from './LoginForm';

export default async function LoginPage() {
  // Server-side session check — redirect authenticated users away from /login
  const session = await auth();
  if (session) {
    redirect('/dashboard');
  }

  return <LoginForm />;
}
