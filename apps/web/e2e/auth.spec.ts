/**
 * Auth E2E tests — AUTH-06 redirect behavior
 *
 * AUTH-06: Unauthenticated requests to /dashboard and /profile must redirect to /login.
 *
 * These tests run against a live Next.js server (localhost:3000 by default).
 * Start the dev server with `pnpm --filter @repo/web dev` before running.
 *
 * The credential sign-in E2E is a follow-up test (requires a seeded verified user in the DB).
 * The redirect test runs without any database dependency — it only needs the Next.js server
 * and the NextAuth middleware to be active.
 */

import { test, expect } from '@playwright/test';

/**
 * AUTH-06: Unauthenticated GET to /dashboard must end at /login.
 *
 * The NextAuth middleware (middleware.ts with matcher ["/dashboard/:path*", "/profile/:path*"])
 * intercepts requests from unauthenticated sessions and redirects them to pages.signIn = "/login".
 */
test('unauthenticated access to /dashboard redirects to /login', async ({ page }) => {
  // Clear any existing auth cookies to ensure unauthenticated state
  await page.context().clearCookies();

  // Navigate to the protected /dashboard route
  await page.goto('/dashboard');

  // NextAuth middleware should redirect to /login (with optional ?callbackUrl param)
  await expect(page).toHaveURL(/\/login/);
});

/**
 * AUTH-06: Unauthenticated GET to /profile must end at /login.
 */
test('unauthenticated access to /profile redirects to /login', async ({ page }) => {
  await page.context().clearCookies();

  await page.goto('/profile');

  await expect(page).toHaveURL(/\/login/);
});

/**
 * AUTH-06: The login page renders when unauthenticated users are redirected.
 * Confirms the redirect destination is a real page (not a 404 or error page).
 */
test('/login page is accessible for unauthenticated users', async ({ page }) => {
  await page.context().clearCookies();

  await page.goto('/login');

  // Should stay on /login (not redirect away since user is not authenticated)
  await expect(page).toHaveURL(/\/login/);

  // The login form should render correctly
  await expect(page.getByRole('heading', { name: 'Sign in to your account' })).toBeVisible();
  await expect(page.getByLabel('Email')).toBeVisible();
  await expect(page.getByLabel('Password')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Sign in' })).toBeVisible();
});

/**
 * Follow-up: Full credential sign-in E2E (AUTH-05)
 * Requires: seeded verified user in the database.
 * Marked as a follow-up — run this after seeding is complete (Phase 2 Plan 07 / seeding phase).
 *
 * To activate: remove the `.skip` and ensure a test user is seeded:
 *   email: test-e2e@example.com
 *   password: TestPassword123!
 *   emailVerified: new Date()
 */
test.skip('verified user signs in with credentials and lands on /dashboard', async ({ page }) => {
  await page.context().clearCookies();

  await page.goto('/login');

  await page.getByLabel('Email').fill('test-e2e@example.com');
  await page.getByLabel('Password').fill('TestPassword123!');
  await page.getByRole('button', { name: 'Sign in' }).click();

  // Should redirect to /dashboard after successful sign-in
  await expect(page).toHaveURL(/\/dashboard/, { timeout: 10_000 });
});
