---
phase: 1
slug: foundation-infrastructure
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-06-11
---

# Phase 1 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 2.x |
| **Config file** | `vitest.config.ts` in each app/package (none yet — Wave 0 creates them) |
| **Quick run command** | `pnpm --filter <changed-package> run type-check` |
| **Full suite command** | `pnpm turbo run type-check lint` |
| **Estimated runtime** | ~30 seconds |

---

## Sampling Rate

- **After every task commit:** Run `pnpm --filter <changed-package> run type-check`
- **After every plan wave:** Run `pnpm turbo run type-check lint && docker compose ps`
- **Before `/gsd:verify-work`:** `docker compose up -d` + `pnpm db:migrate` + health checks return 200
- **Max feedback latency:** ~30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| smoke-docker | — | 1 | Phase gate | T-1-03 | No services bound to 0.0.0.0 in dev | smoke | `docker compose ps` | ❌ Wave 0 | ⬜ pending |
| smoke-migrate | — | 1 | Phase gate | T-1-01 | .env gitignored; placeholder .env.example | smoke | `pnpm db:migrate` | ❌ Wave 0 | ⬜ pending |
| smoke-api-health | — | 1 | Phase gate | — | ValidationPipe applied globally | smoke | `curl -sf http://localhost:3001/api/health` | ❌ Wave 0 | ⬜ pending |
| smoke-web-health | — | 1 | Phase gate | — | N/A (static health route) | smoke | `curl -sf http://localhost:3000/api/health` | ❌ Wave 0 | ⬜ pending |
| lint-typecheck | — | 1 | Phase gate | — | strict: true across all workspaces | lint | `pnpm turbo run type-check` | ❌ Wave 0 | ⬜ pending |
| lint-eslint | — | 1 | Phase gate | — | N/A | lint | `pnpm turbo run lint` | ❌ Wave 0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `apps/api/vitest.config.ts` — NestJS unit test config with SWC transformer
- [ ] `apps/web/vitest.config.ts` — Next.js component test config
- [ ] `packages/database/vitest.config.ts` — DB utility test config
- [ ] `packages/shared/vitest.config.ts` — Shared schema test config
- [ ] Root `turbo.json` must include `"test"` task definition

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| `docker compose up` starts PostgreSQL, Redis ×2, MinIO without errors | Phase gate SC-1 | Requires running Docker daemon | Run `docker compose up -d && docker compose ps` — all 4 services show "Up (healthy)" |
| MinIO console accessible at localhost:9001 | Phase gate SC-1 | Browser-based | Open http://localhost:9001 — login with MINIO_ACCESS_KEY/SECRET |
| CI pipeline passes on push | Phase gate SC-3 | GitHub Actions | Push to branch, verify all 4 CI steps green in GitHub Actions |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
