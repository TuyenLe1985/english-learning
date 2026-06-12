/**
 * Playwright configuration for apps/web E2E tests.
 *
 * Tests: AUTH-06 (unauthenticated redirect), future: full auth flow (Plan 05)
 * Base URL: localhost:3000 (Next.js dev server)
 *
 * RESEARCH validation architecture: AUTH-06 E2E test asserts that unauthenticated
 * access to /dashboard resolves to /login (middleware redirect).
 *
 * Run: pnpm --filter @repo/web exec playwright test
 */

import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  // Fail-fast on CI; don't leave partial state
  fullyParallel: true,
  // No retries in local dev; can be increased for CI flakiness tolerance
  retries: process.env.CI ? 1 : 0,
  // Single worker for auth E2E to avoid state conflicts
  workers: 1,
  // HTML report for CI artifacts; dot for local dev
  reporter: process.env.CI ? 'html' : 'dot',
  use: {
    // Next.js dev server base URL
    baseURL: process.env.E2E_BASE_URL ?? 'http://localhost:3000',
    // Capture trace on first retry for debugging
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  // webServer: optional — E2E tests are designed to run against a running Next.js server.
  // Start the server separately with `pnpm --filter @repo/web dev` before running E2E.
  // For CI, add a webServer block here pointing to the production build.
});
