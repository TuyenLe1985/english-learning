/**
 * Vocabulary module E2E tests — Wave 0 RED scaffolds (Plan 03-01)
 *
 * T-03-01: Elevation of Privilege — unauthenticated users accessing /vocabulary or /review
 * must be redirected to /login (middleware.ts matcher extended in Plan 03-01).
 *
 * RESEARCH Pitfall 3: Middleware does not protect /vocabulary and /review unless added to matcher.
 * VOCAB-06: /review page is protected from unauthenticated access.
 *
 * These redirect tests run without any database dependency — they only need the
 * Next.js server and NextAuth middleware to be active.
 *
 * Start the dev server with `pnpm --filter @repo/web dev` before running.
 * Run: pnpm --filter @repo/web exec playwright test vocabulary.spec.ts
 */

import { test, expect } from '@playwright/test';

// ─── Route protection tests (T-03-01) ────────────────────────────────────────

test('unauthenticated access to /vocabulary redirects to /login', async ({ page }) => {
  // Clear any existing auth cookies to ensure unauthenticated state
  await page.context().clearCookies();

  // Navigate to the protected /vocabulary route
  await page.goto('/vocabulary');

  // NextAuth middleware should redirect to /login (with optional ?callbackUrl param)
  await expect(page).toHaveURL(/\/login/);
});

test('unauthenticated access to /review redirects to /login', async ({ page }) => {
  await page.context().clearCookies();

  await page.goto('/review');

  await expect(page).toHaveURL(/\/login/);
});

test('unauthenticated access to /vocabulary/business redirects to /login', async ({ page }) => {
  await page.context().clearCookies();

  await page.goto('/vocabulary/business');

  await expect(page).toHaveURL(/\/login/);
});

test('unauthenticated access to /vocabulary/business/words redirects to /login', async ({ page }) => {
  await page.context().clearCookies();

  await page.goto('/vocabulary/business/words');

  await expect(page).toHaveURL(/\/login/);
});

// ─── Page-content tests (require authenticated session + implemented pages) ───
// These are skipped in Wave 0 — implemented in Plans 02 and 03.

test.skip(
  'authenticated user can see 8 vocabulary categories',
  // TODO: implemented in Plan 03-02 (vocabulary browse pages)
  async ({ page }) => {
    await page.goto('/vocabulary');
    const cards = page.locator('[data-testid="category-card"]');
    await expect(cards).toHaveCount(8);
  },
);

test.skip(
  'vocabulary category page shows 20 words per page',
  // TODO: implemented in Plan 03-02 (vocabulary browse pages)
  async ({ page }) => {
    await page.goto('/vocabulary/business');
    const words = page.locator('[data-testid="word-list-item"]');
    await expect(words).toHaveCount(20);
  },
);

test.skip(
  'SRS review queue shows past-due cards for demo user',
  // TODO: implemented in Plan 03-04 (SRS review queue)
  async ({ page }) => {
    await page.goto('/review');
    const cards = page.locator('[data-testid="review-card"]');
    await expect(cards).toHaveCount(5); // 5 seeded past-due cards
  },
);
