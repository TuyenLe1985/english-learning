/**
 * Vocabulary module E2E tests
 *
 * T-03-01: Elevation of Privilege — unauthenticated users accessing /vocabulary or /review
 * must be redirected to /login (middleware.ts matcher extended in Plan 03-01).
 *
 * Authenticated happy-path tests (Plan 03-06):
 *   - Redirect tests confirm unauthenticated access is blocked
 *   - Authenticated tests confirm full SRS review flow (seeded demo user)
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

// ─── Authenticated happy-path tests (Plan 03-06, seeded demo user) ────────────
// These tests require: `docker compose up` + seed run + `pnpm dev`
// Demo user: demo@example.com / demo1234

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

/**
 * Authenticated SRS review flow (Plan 03-06)
 *
 * This test requires the demo user (demo@example.com / demo1234) to be logged in
 * with seeded past-due cards. In CI/CD, use a stored auth state:
 *   - playwright.config.ts storageState from a login setup fixture
 * For manual verification, sign in first and then run this test.
 *
 * Skipped by default — run manually via checkpoint verification.
 */
test.skip(
  'authenticated demo user can review a due card and rate Good',
  async ({ page }) => {
    // Navigate to /review as an authenticated user (session must be active)
    await page.goto('/review');

    // Should NOT redirect to /login
    await expect(page).not.toHaveURL(/\/login/);

    // Review queue should be visible with the data-testid="srs-queue" container
    const queueContainer = page.locator('[data-testid="srs-queue"]');
    await expect(queueContainer).toBeVisible();

    // There should be at least 1 due card (5 seeded)
    const showAnswerButton = page.getByText('Show answer');
    await expect(showAnswerButton).toBeVisible();

    // Click "Show answer" to reveal the card
    await showAnswerButton.click();

    // Rating buttons should now appear
    await expect(page.getByRole('button', { name: 'Rate as Good' })).toBeVisible();

    // Rate the card "Good"
    await page.getByRole('button', { name: 'Rate as Good' }).click();

    // After rating, the queue should update (either next card or "All caught up!")
    await page.waitForTimeout(500); // Wait for React Query invalidation

    // Either another card is shown, or the "All caught up!" empty state appears
    const hasNextCard = await page.getByText('Show answer').isVisible().catch(() => false);
    const allCaughtUp = await page.getByText('All caught up!').isVisible().catch(() => false);
    expect(hasNextCard || allCaughtUp).toBe(true);
  },
);
