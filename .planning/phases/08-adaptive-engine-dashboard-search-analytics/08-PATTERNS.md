# Phase 8: Adaptive Engine + Dashboard + Search + Analytics - Pattern Map

**Mapped:** 2026-06-20
**Files analyzed:** 38 new/modified files
**Analogs found:** 35 / 38

---

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `apps/api/src/adaptive/adaptive.module.ts` | module | — | `apps/api/src/gamification/gamification.module.ts` | exact |
| `apps/api/src/adaptive/adaptive.controller.ts` | controller | request-response | `apps/api/src/gamification/gamification.controller.ts` | exact |
| `apps/api/src/adaptive/adaptive.service.ts` | service | CRUD | `apps/api/src/gamification/gamification.service.ts` | exact |
| `apps/api/src/adaptive/adaptive.dto.ts` | DTO/schema | — | `packages/shared/src/grammar.dto.ts` | role-match |
| `apps/api/src/search/search.module.ts` | module | — | `apps/api/src/gamification/gamification.module.ts` | role-match |
| `apps/api/src/search/search.controller.ts` | controller | request-response | `apps/api/src/grammar/grammar.controller.ts` | role-match |
| `apps/api/src/search/search.service.ts` | service | request-response | `apps/api/src/grammar/grammar.service.ts` | role-match |
| `apps/api/src/search/search.dto.ts` | DTO/schema | — | `packages/shared/src/grammar.dto.ts` | role-match |
| `apps/api/src/analytics/analytics.module.ts` | module | — | `apps/api/src/gamification/gamification.module.ts` | role-match |
| `apps/api/src/analytics/analytics.controller.ts` | controller | request-response | `apps/api/src/gamification/gamification.controller.ts` | exact |
| `apps/api/src/analytics/analytics.service.ts` | service | CRUD | `apps/api/src/gamification/gamification.service.ts` | role-match |
| `apps/api/src/analytics/analytics.dto.ts` | DTO/schema | — | `packages/shared/src/grammar.dto.ts` | role-match |
| `apps/api/src/analytics/redis-cache.service.ts` | service | request-response | `apps/api/src/profile/profile.service.ts` (external client init pattern) | partial-match |
| `apps/api/src/auth/roles.decorator.ts` | utility | — | `apps/api/src/auth/jwt-auth.guard.ts` | role-match |
| `apps/api/src/auth/roles.guard.ts` | middleware/guard | request-response | `apps/api/src/auth/jwt-auth.guard.ts` | exact |
| `apps/api/src/app.module.ts` (modify) | module | — | itself | exact |
| `packages/database/prisma/schema.prisma` (modify) | migration/config | — | itself | exact |
| `packages/shared/src/index.ts` (modify) | barrel export | — | itself | exact |
| `apps/web/src/app/(dashboard)/dashboard/page.tsx` (replace) | component (page) | request-response | `apps/web/src/app/(dashboard)/reading/page.tsx` | exact |
| `apps/web/src/app/(dashboard)/search/page.tsx` | component (page) | request-response | `apps/web/src/app/(dashboard)/reading/page.tsx` | exact |
| `apps/web/src/app/(dashboard)/analytics/page.tsx` | component (page) | request-response | `apps/web/src/app/(dashboard)/reading/page.tsx` | exact |
| `apps/web/src/app/(dashboard)/admin/page.tsx` | component (page) | request-response | `apps/web/src/app/(dashboard)/reading/page.tsx` | role-match |
| `apps/web/src/app/(dashboard)/layout.tsx` (modify) | component (layout) | — | itself | exact |
| `apps/web/src/app/api/adaptive/dashboard/route.ts` | route (relay) | request-response | `apps/web/src/app/api/profile/me/route.ts` | exact |
| `apps/web/src/app/api/adaptive/recommendation/route.ts` | route (relay) | request-response | `apps/web/src/app/api/profile/me/route.ts` | exact |
| `apps/web/src/app/api/search/route.ts` | route (relay) | request-response | `apps/web/src/app/api/profile/me/route.ts` | exact |
| `apps/web/src/app/api/analytics/me/route.ts` | route (relay) | request-response | `apps/web/src/app/api/profile/me/route.ts` | exact |
| `apps/web/src/app/api/admin/analytics/route.ts` | route (relay) | request-response | `apps/web/src/app/api/profile/me/route.ts` | exact |
| `apps/web/src/components/dashboard/dashboard-hero.tsx` | component (client) | — | `apps/web/src/components/gamification/xp-progress-bar.tsx` | exact |
| `apps/web/src/components/dashboard/skill-scores-card.tsx` | component (client) | — | `apps/web/src/components/gamification/achievement-grid.tsx` | role-match |
| `apps/web/src/components/dashboard/skill-radar-chart.tsx` | component (client) | — | `apps/web/src/components/gamification/xp-progress-bar.tsx` | partial-match |
| `apps/web/src/components/dashboard/activity-bar-chart.tsx` | component (client) | — | `apps/web/src/components/gamification/xp-progress-bar.tsx` | partial-match |
| `apps/web/src/components/dashboard/continue-learning-widget.tsx` | component (client) | — | `apps/web/src/components/gamification/achievement-badge.tsx` | role-match |
| `apps/web/src/components/dashboard/recently-viewed-row.tsx` | component (client) | — | `apps/web/src/components/gamification/achievement-grid.tsx` | role-match |
| `apps/web/src/components/dashboard/bookmarked-row.tsx` | component (client) | — | `apps/web/src/components/gamification/achievement-grid.tsx` | role-match |
| `apps/web/src/components/search/top-nav-search.tsx` | component (client) | — | `apps/web/src/app/(dashboard)/reading/reading-filters.tsx` | role-match |
| `apps/web/src/components/search/search-result-group.tsx` | component (client) | — | `apps/web/src/components/gamification/achievement-grid.tsx` | role-match |
| `apps/web/src/components/search/search-filters.tsx` | component (client) | — | `apps/web/src/app/(dashboard)/reading/reading-filters.tsx` | exact |
| `apps/web/src/components/analytics/activity-heatmap.tsx` | component (client) | — | `apps/web/src/components/gamification/xp-progress-bar.tsx` | partial-match |
| `apps/web/src/components/analytics/cefr-progression-chart.tsx` | component (client) | — | `apps/web/src/components/gamification/xp-progress-bar.tsx` | partial-match |

---

## Pattern Assignments

### `apps/api/src/adaptive/adaptive.module.ts` (module)

**Analog:** `apps/api/src/gamification/gamification.module.ts`

**Module pattern** (lines 1-23):
```typescript
import { Module } from "@nestjs/common";
import { AdaptiveService } from "./adaptive.service";
import { AdaptiveController } from "./adaptive.controller";
import { AuthModule } from "../auth/auth.module";

@Module({
  imports: [AuthModule], // provides JwtAuthGuard
  controllers: [AdaptiveController],
  providers: [AdaptiveService],
  exports: [AdaptiveService], // exported so Grammar/Vocabulary/Reading/Listening/Quiz can inject
})
export class AdaptiveModule {}
```

---

### `apps/api/src/adaptive/adaptive.controller.ts` (controller, request-response)

**Analog:** `apps/api/src/gamification/gamification.controller.ts`

**Imports pattern** (lines 1-22):
```typescript
import { Controller, Get, Request, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AdaptiveService } from './adaptive.service';
```

**Auth/Guard pattern** (lines 44-50 of gamification.controller.ts):
```typescript
// AuthenticatedRequest interface — copy from gamification.controller.ts lines 25-33
interface AuthenticatedRequest {
  user: {
    userId: string;
    role?: string;
    cefrLevel?: string;
    email?: string;
  };
}

@Controller('adaptive')
export class AdaptiveController {
  constructor(private readonly adaptiveService: AdaptiveService) {}

  @UseGuards(JwtAuthGuard)
  @Get('dashboard')
  async getDashboard(@Request() req: AuthenticatedRequest) {
    return this.adaptiveService.getDashboardData(req.user.userId);
  }

  @UseGuards(JwtAuthGuard)
  @Get('recommendation')
  async getRecommendation(@Request() req: AuthenticatedRequest) {
    return this.adaptiveService.getContinueLearningRecommendation(req.user.userId);
  }
}
```

---

### `apps/api/src/adaptive/adaptive.service.ts` (service, CRUD)

**Analog:** `apps/api/src/gamification/gamification.service.ts`

**Imports pattern** (lines 13-21 of gamification.service.ts):
```typescript
import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { differenceInCalendarDays } from "date-fns";
import type { SkillArea } from "@prisma/client";
```

**Core upsert pattern** — copy the Prisma upsert structure from gamification.service.ts lines 73-114 (`$transaction`) but simplified for SkillScore:
```typescript
@Injectable()
export class AdaptiveService {
  constructor(private readonly prisma: PrismaService) {}

  async updateSkillScore(
    userId: string,
    skillArea: SkillArea,
    accuracy: number, // 0.0–1.0
  ): Promise<void> {
    const existing = await this.prisma.skillScore.findUnique({
      where: { userId_skillArea: { userId, skillArea } },
    });
    const alpha = 0.3;
    const newAccuracy = existing
      ? existing.accuracy * (1 - alpha) + accuracy * alpha
      : accuracy;

    await this.prisma.skillScore.upsert({
      where: { userId_skillArea: { userId, skillArea } },
      create: { userId, skillArea, accuracy: newAccuracy, isWeak: newAccuracy < 0.6 },
      update: { accuracy: newAccuracy, isWeak: newAccuracy < 0.6 },
    });
  }
}
```

**Streak helper pattern** — copy `checkStreak()` from gamification.service.ts lines 262-298:
```typescript
// Uses date-fns differenceInCalendarDays — same import as GamificationService
// Query ActivityLog for last N+2 days, deduplicate to calendar dates, count backward
private async computeCurrentStreak(userId: string): Promise<number> {
  const since = new Date();
  since.setDate(since.getDate() - 32);
  const logs = await this.prisma.activityLog.findMany({
    where: { userId, loggedAt: { gte: since } },
    orderBy: { loggedAt: 'desc' },
    select: { loggedAt: true },
  });
  const days = [...new Set(logs.map((l) => l.loggedAt.toISOString().slice(0, 10)))]
    .sort().reverse();
  let streak = 0;
  for (let i = 0; i < days.length; i++) {
    const prev = i === 0 ? new Date() : new Date(days[i - 1]!);
    const curr = new Date(days[i]!);
    if (differenceInCalendarDays(prev, curr) === 1 ||
        (i === 0 && differenceInCalendarDays(new Date(), curr) <= 1)) {
      streak++;
    } else break;
  }
  return streak;
}
```

---

### `apps/api/src/search/search.controller.ts` (controller, request-response)

**Analog:** `apps/api/src/grammar/grammar.controller.ts`

**Imports + Query param pattern** (lines 1-50 of grammar.controller.ts):
```typescript
import { Controller, Get, Query, Request, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { SearchService } from './search.service';

@Controller('search')
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  // GET /api/search?q=...&level=...&topic=...&skill=...
  @UseGuards(JwtAuthGuard)
  @Get()
  async search(
    @Query('q') q: string,
    @Query('level') level?: string,
    @Query('topic') topic?: string,
    @Query('skill') skill?: string,
  ) {
    return this.searchService.search(q ?? '', { level, topic, skill });
  }
}
```

---

### `apps/api/src/search/search.service.ts` (service, request-response)

**Analog:** `apps/api/src/grammar/grammar.service.ts`

**Imports pattern** (lines 1-30 of grammar.service.ts — adapt):
```typescript
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';
```

**Core $queryRaw FTS pattern** — from RESEARCH.md Pattern 2:
```typescript
// plainto_tsquery auto-escapes user input — no SQL injection risk
// ts_headline is applied post-filter (not indexed) — keep LIMIT 100 on outer query
async search(q: string, filters: SearchFilters): Promise<SearchResultRow[]> {
  return this.prisma.$queryRaw<SearchResultRow[]>`
    SELECT id, 'vocabulary' AS type, word AS title,
           ts_headline('english', definition, plainto_tsquery('english', ${q}),
             'StartSel=<mark>,StopSel=</mark>,MaxWords=15,MinWords=10') AS snippet,
           "cefrLevel", topic
    FROM "VocabularyWord"
    WHERE to_tsvector('english', word || ' ' || definition) @@ plainto_tsquery('english', ${q})
    UNION ALL
    -- (3 more UNION ALL blocks for grammar, reading, listening)
    LIMIT 100
  `;
}
```

---

### `apps/api/src/analytics/analytics.controller.ts` (controller, request-response)

**Analog:** `apps/api/src/gamification/gamification.controller.ts`

**Two-endpoint pattern with role guard**:
```typescript
// endpoint 1: student analytics — JwtAuthGuard only
@UseGuards(JwtAuthGuard)
@Get('me')
async getStudentAnalytics(@Request() req: AuthenticatedRequest) {
  return this.analyticsService.getStudentAnalytics(req.user.userId);
}

// endpoint 2: admin analytics — JwtAuthGuard + RolesGuard
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
@Get('admin')
async getAdminAnalytics() {
  return this.analyticsService.getAdminAnalytics();
}
```

**Note:** RolesGuard must be applied AFTER JwtAuthGuard (so req.user is populated). Both guards are listed in `@UseGuards()` left-to-right execution order.

---

### `apps/api/src/analytics/analytics.service.ts` (service, CRUD)

**Analog:** `apps/api/src/gamification/gamification.service.ts`

**Redis cache-aside pattern** — from RESEARCH.md Pattern 4:
```typescript
// In getAdminAnalytics():
const cacheKey = 'admin:analytics:v1';
const cached = await this.redisCache.get<AdminAnalyticsDto>(cacheKey);
if (cached) return cached;

const data = await this.computeAdminAnalytics(); // expensive GROUP BY queries
await this.redisCache.set(cacheKey, data, 300); // TTL 5 minutes
return data;
```

---

### `apps/api/src/analytics/redis-cache.service.ts` (service, request-response)

**Analog:** `apps/api/src/profile/profile.service.ts` (external client constructor init pattern, lines 36-57)

**Constructor + lifecycle pattern**:
```typescript
// Copy constructor init style from profile.service.ts lines 36-57 (S3Client init)
// Replace with ioredis init via ConfigService
import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class RedisCacheService implements OnModuleInit, OnModuleDestroy {
  private client!: Redis;
  constructor(private readonly config: ConfigService) {}

  onModuleInit(): void {
    this.client = new Redis(
      this.config.get<string>('REDIS_URL_CACHE') ?? 'redis://localhost:6380'
    );
  }

  async onModuleDestroy(): Promise<void> {
    await this.client.quit();
  }

  async get<T>(key: string): Promise<T | null> {
    const val = await this.client.get(key);
    return val ? (JSON.parse(val) as T) : null;
  }

  async set(key: string, value: unknown, ttlSeconds: number): Promise<void> {
    await this.client.set(key, JSON.stringify(value), 'EX', ttlSeconds);
  }
}
```

---

### `apps/api/src/auth/roles.guard.ts` (middleware/guard, request-response)

**Analog:** `apps/api/src/auth/jwt-auth.guard.ts`

**Guard interface pattern** (lines 1-55 of jwt-auth.guard.ts — all 55 lines):
```typescript
// Copy the CanActivate interface pattern from jwt-auth.guard.ts
// Change: read metadata via Reflector instead of decoding JWT
import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from './roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!requiredRoles) return true; // no @Roles() = open to any authenticated user
    const { user } = context.switchToHttp().getRequest();
    return requiredRoles.includes(user?.role);
  }
}
```

**Note:** `STUDENT` and `ADMIN` are the actual UserRole enum values in the DB (not `USER`). jwt-auth.guard.ts line 45 confirms `request.user = payload` which includes `role` field from the JWT. `apps/web/src/auth.ts` line 65 confirms `token.role = "STUDENT"` as the default.

---

### `apps/api/src/app.module.ts` (modify)

**Analog:** itself — lines 1-38

**Registration pattern** (lines 13-14 of app.module.ts — copy existing import+registration pattern):
```typescript
// Add these 3 import lines (same pattern as GamificationModule on line 13):
import { AdaptiveModule } from './adaptive/adaptive.module';
import { SearchModule } from './search/search.module';
import { AnalyticsModule } from './analytics/analytics.module';

// Add to the imports array (same pattern as existing modules on lines 18-34):
AdaptiveModule,
SearchModule,
AnalyticsModule,
```

---

### `apps/web/src/app/(dashboard)/dashboard/page.tsx` (replace, component page, request-response)

**Analog:** `apps/web/src/app/(dashboard)/reading/page.tsx`

**Server Component pattern** (lines 1-57 of reading/page.tsx):
```typescript
// Copy exact pattern:
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { headers } from "next/headers";
import { fetchWithAuth, INTERNAL_API_URL } from "@/lib/api-client";

export default async function DashboardPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const reqHeaders = await headers();
  const cookieHeader = reqHeaders.get("cookie") ?? "";

  // Fetch from NestJS via relay pattern (same as reading/page.tsx lines 35-57)
  const res = await fetchWithAuth(cookieHeader, `${INTERNAL_API_URL}/api/adaptive/dashboard`);
  const dashboardData = res.ok ? await res.json() : null;

  return (
    <div className="mx-auto max-w-screen-xl px-4 py-8">
      {/* DashboardHero — full width */}
      {/* Two-column grid — D-02 */}
      {/* Horizontal scroll rows — D-04 */}
    </div>
  );
}
```

---

### `apps/web/src/app/(dashboard)/search/page.tsx` (component page, request-response)

**Analog:** `apps/web/src/app/(dashboard)/reading/page.tsx`

**Server Component + URL search params pattern** (lines 68-92 of reading/page.tsx):
```typescript
// Copy searchParams prop pattern from reading/page.tsx lines 68-92
interface Props {
  searchParams: Promise<{ q?: string; level?: string; topic?: string; skill?: string }>;
}

export default async function SearchPage({ searchParams }: Props) {
  const session = await auth();
  if (!session) redirect("/login");

  const { q, level, topic, skill } = await searchParams;

  // Only fetch if query present — avoids NestJS call on empty search
  let results = null;
  if (q) {
    const reqHeaders = await headers();
    const cookieHeader = reqHeaders.get("cookie") ?? "";
    const url = new URL(`${INTERNAL_API_URL}/api/search`);
    url.searchParams.set('q', q);
    if (level) url.searchParams.set('level', level);
    if (topic) url.searchParams.set('topic', topic);
    if (skill) url.searchParams.set('skill', skill);
    const res = await fetchWithAuth(cookieHeader, url.toString());
    results = res.ok ? await res.json() : null;
  }
  // ...render grouped results
}
```

---

### `apps/web/src/app/(dashboard)/admin/page.tsx` (component page, request-response)

**Analog:** `apps/web/src/app/(dashboard)/reading/page.tsx`

**Role-gate pattern** — extend the Server Component auth check:
```typescript
export default async function AdminPage() {
  const session = await auth();
  if (!session) redirect("/login");

  // Role gate: redirect non-admin users to dashboard
  if (session.user?.role !== 'ADMIN') redirect("/dashboard");

  // ... fetch admin analytics and render
}
```

---

### `apps/web/src/app/(dashboard)/layout.tsx` (modify)

**Analog:** itself (lines 1-66)

**Add search input to header** — insert between logo and sign-out button (lines 33-54):
```tsx
{/* Top-nav search input — navigates to /search?q= on submit */}
{/* Insert after the logo <a> element, before the sign-out form */}
<form action="/search" method="GET" className="flex-1 max-w-sm mx-4">
  <input
    type="search"
    name="q"
    placeholder="Search lessons..."
    className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm"
  />
</form>
```

**Add admin sidebar link** — conditional on `session.user?.role === 'ADMIN'`:
```tsx
{session.user?.role === 'ADMIN' && (
  <a href="/admin" className="...">Admin</a>
)}
```

---

### Next.js relay routes: `apps/web/src/app/api/adaptive/dashboard/route.ts`, `adaptive/recommendation/route.ts`, `search/route.ts`, `analytics/me/route.ts`, `admin/analytics/route.ts`

**Analog:** `apps/web/src/app/api/profile/me/route.ts` (all 37 lines)

**Relay GET pattern** (copy entire file, change only the NestJS URL):
```typescript
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { headers } from "next/headers";
import { fetchWithAuth, API_URL } from "@/lib/api-client";

export async function GET(): Promise<NextResponse> {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const reqHeaders = await headers();
  const cookieHeader = reqHeaders.get("cookie") ?? "";

  // Change URL per route:
  //   adaptive/dashboard  → `${API_URL}/api/adaptive/dashboard`
  //   adaptive/recommendation → `${API_URL}/api/adaptive/recommendation`
  //   search              → build URL with forwarded query params (see below)
  //   analytics/me        → `${API_URL}/api/analytics/me`
  //   admin/analytics     → `${API_URL}/api/admin/analytics`
  const res = await fetchWithAuth(cookieHeader, `${API_URL}/api/adaptive/dashboard`);

  if (!res.ok) {
    const body = await res.text();
    return NextResponse.json(
      { error: body || "Request failed" },
      { status: res.status },
    );
  }

  const data = await res.json();
  return NextResponse.json(data);
}
```

**Search relay needs query param forwarding** — extend the pattern:
```typescript
// apps/web/src/app/api/search/route.ts
export async function GET(req: NextRequest): Promise<NextResponse> {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const reqHeaders = await headers();
  const cookieHeader = reqHeaders.get("cookie") ?? "";

  // Forward all query params to NestJS
  const { searchParams } = new URL(req.url);
  const nestUrl = new URL(`${API_URL}/api/search`);
  searchParams.forEach((v, k) => nestUrl.searchParams.set(k, v));

  const res = await fetchWithAuth(cookieHeader, nestUrl.toString());
  // ... same ok-check and return pattern
}
```

---

### `apps/web/src/components/dashboard/dashboard-hero.tsx` (component, client)

**Analog:** `apps/web/src/components/gamification/xp-progress-bar.tsx` (all 42 lines)

**"use client" + Progress bar composition pattern** (lines 1-42):
```typescript
"use client";

import { Progress } from "@/components/ui/progress";
import { LevelBadge } from "@/components/gamification/level-badge";
import { CefrBadge } from "@/components/cefr-badge";

// Reuse XpProgressBar directly — it already handles xpTotal % 100 formula
import { XpProgressBar } from "@/components/gamification/xp-progress-bar";

interface DashboardHeroProps {
  xpTotal: number;
  level: number;
  cefrLevel: 'B1' | 'B2' | 'C1';
  streak: number;
}

export function DashboardHero({ xpTotal, level, cefrLevel, streak }: DashboardHeroProps) {
  return (
    <Card className="mb-6 w-full">
      <CardContent className="p-6">
        <div className="flex flex-wrap items-center gap-4 mb-4">
          <LevelBadge level={level} size="lg" />
          <CefrBadge level={cefrLevel} />
          {/* streak flame + count */}
        </div>
        <XpProgressBar xpTotal={xpTotal} level={level} />
      </CardContent>
    </Card>
  );
}
```

---

### `apps/web/src/components/dashboard/skill-scores-card.tsx` and `apps/web/src/components/dashboard/skill-radar-chart.tsx` (component, client)

**Analog:** `apps/web/src/components/gamification/achievement-grid.tsx` (grid/card list pattern, lines 1-55)

**"use client" + grid mapping pattern** (lines 1-55 of achievement-grid.tsx):
```typescript
"use client";

// Copy the grid + map pattern:
// Map SkillScore[] into rows showing skill name + accuracy bar
// For radar chart: mark with "use client" and wrap ResponsiveContainer in h-[220px] div
// per RESEARCH.md Pitfall 6 (ResponsiveContainer needs explicit parent height)
```

**Recharts client import pattern** — from RESEARCH.md Pattern 5:
```typescript
"use client";
// CRITICAL: "use client" required — Recharts measures DOM width client-side (Pitfall 7)
import { ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Tooltip } from 'recharts';

export function SkillRadarChart({ data }: { data: SkillRadarPoint[] }) {
  return (
    // CRITICAL: explicit height on wrapper div — Pitfall 6
    <div style={{ height: 220 }}>
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart data={data} cx="50%" cy="50%" outerRadius="80%">
          <PolarGrid />
          <PolarAngleAxis dataKey="skill" tick={{ fontSize: 12 }} />
          <PolarRadiusAxis domain={[0, 100]} tick={false} />
          <Radar dataKey="accuracy" stroke="var(--primary)" fill="var(--primary)" fillOpacity={0.3} />
          <Tooltip />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}
```

---

### `apps/web/src/components/dashboard/recently-viewed-row.tsx` and `apps/web/src/components/dashboard/bookmarked-row.tsx` (component, client)

**Analog:** `apps/web/src/components/gamification/achievement-grid.tsx` (grid pattern, lines 31-55)

**Horizontal scroll + Card pattern**:
```typescript
"use client";
// shadcn ScrollArea (must install via `npx shadcn@latest add scroll-area` — see Open Questions #2)
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Card, CardContent } from "@/components/ui/card";
import { CefrBadge } from "@/components/cefr-badge";

export function RecentlyViewedRow({ items }: { items: ContentItem[] }) {
  return (
    <ScrollArea className="w-full whitespace-nowrap">
      <div className="flex gap-4 pb-4">
        {items.map((item) => (
          <Card key={item.id} className="w-[200px] flex-shrink-0">
            <CardContent className="p-3">
              <CefrBadge level={item.cefrLevel} />
              <p className="mt-2 text-sm font-medium line-clamp-2">{item.title}</p>
            </CardContent>
          </Card>
        ))}
      </div>
      <ScrollBar orientation="horizontal" />
    </ScrollArea>
  );
}
```

---

### `apps/web/src/components/search/search-filters.tsx` (component, client)

**Analog:** `apps/web/src/app/(dashboard)/reading/reading-filters.tsx` (all 142 lines — exact copy base)

**URL-driven filter pattern** (lines 53-142 of reading-filters.tsx):
```typescript
"use client";
// Copy ReadingFilters exactly: useRouter, useSearchParams, buildUrl callback
// Change: filters are ?level=&topic=&skill= (not ?level=&topic=&type=)
// Change: navigation target is /search (not /reading)
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
```

---

### `apps/web/src/components/search/top-nav-search.tsx` (component, client)

**Analog:** `apps/web/src/app/(dashboard)/reading/reading-filters.tsx`

**Router navigation pattern** (lines 78-82 of reading-filters.tsx):
```typescript
"use client";
import { useRouter } from "next/navigation";

export function TopNavSearch() {
  const router = useRouter();
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const q = (e.currentTarget.elements.namedItem('q') as HTMLInputElement).value.trim();
    if (q) router.push(`/search?q=${encodeURIComponent(q)}`);
  };
  return (
    <form onSubmit={handleSubmit} className="flex-1 max-w-sm mx-4">
      <input type="search" name="q" placeholder="Search lessons..." className="..." />
    </form>
  );
}
```

---

### `apps/web/src/components/analytics/activity-heatmap.tsx` (component, client)

**Analog:** `apps/web/src/components/gamification/xp-progress-bar.tsx` (client component pattern)

**react-activity-calendar pattern** — from RESEARCH.md Pattern 6:
```typescript
"use client"; // required — ActivityCalendar uses SVG DOM measurement
import ActivityCalendar from 'react-activity-calendar';

// Data: Activity[] from /api/analytics/me heatmap field
// Level mapping (D-16):
function toLevel(count: number): 0 | 1 | 2 | 3 | 4 {
  if (count === 0) return 0;
  if (count <= 3) return 1;
  if (count <= 7) return 2;
  if (count <= 10) return 3;
  return 4;
}

// theme prop uses color array (v3 API — NOT deprecated `color` prop per RESEARCH State of the Art)
<ActivityCalendar
  data={activityData}
  theme={{ light: ['hsl(240 4.8% 95.9%)', '#bbf7d0', '#4ade80', '#16a34a', '#14532d'] }}
  showWeekdayLabels
/>
```

---

### `packages/shared/src/index.ts` (modify)

**Analog:** itself (lines 1-31)

**Barrel export pattern** (lines 14-31):
```typescript
// Add at bottom of index.ts following existing pattern:
// Phase 8: Adaptive + Search + Analytics DTOs
export * from "./adaptive.dto";
export * from "./search.dto";
export * from "./analytics.dto";
```

Each DTO file follows the Zod schema pattern from `packages/shared/src/grammar.dto.ts` lines 1-40:
```typescript
import { z } from "zod";

export const DashboardDtoSchema = z.object({
  user: z.object({ xpTotal: z.number(), level: z.number(), cefrLevel: z.enum(["B1", "B2", "C1"]), streak: z.number() }),
  skillScores: z.array(z.object({ skillArea: z.string(), accuracy: z.number(), isWeak: z.boolean() })),
  recommendation: z.object({ preThreshold: z.boolean(), weakestSkill: z.string().optional(), accuracy: z.number().optional() }),
  // ...
});
export type DashboardDto = z.infer<typeof DashboardDtoSchema>;
```

---

### `packages/database/prisma/schema.prisma` (modify — CefrHistory model + GIN migration)

**Analog:** itself

**New model pattern** — follow existing model structure in schema.prisma:
```prisma
model CefrHistory {
  id         String    @id @default(cuid())
  userId     String
  cefrLevel  CefrLevel
  recordedAt DateTime  @default(now())

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId, recordedAt])
}
```

**GIN index migration** — raw SQL appended to a new Prisma migration file (Prisma does not generate GIN syntax):
```sql
-- DO NOT REMOVE: manually added GIN indexes for FTS
CREATE INDEX IF NOT EXISTS "VocabularyWord_fts_idx"
  ON "VocabularyWord" USING GIN (to_tsvector('english', word || ' ' || definition));

CREATE INDEX IF NOT EXISTS "GrammarLesson_fts_idx"
  ON "GrammarLesson" USING GIN (to_tsvector('english', title || ' ' || explanation));
-- NOTE: GrammarLesson uses `explanation` not `content` (Pitfall 1 in RESEARCH.md)

CREATE INDEX IF NOT EXISTS "ReadingPassage_fts_idx"
  ON "ReadingPassage" USING GIN (to_tsvector('english', title || ' ' || content));

CREATE INDEX IF NOT EXISTS "ListeningContent_fts_idx"
  ON "ListeningContent" USING GIN (to_tsvector('english', title || ' ' || "transcriptText"));
-- NOTE: Model is ListeningContent, field is transcriptText (Pitfall 2 in RESEARCH.md)
```

---

### Session-complete endpoint modifications (5 files)

**Files to modify:** `apps/api/src/grammar/grammar.service.ts`, `vocabulary/vocabulary.service.ts`, `reading/reading.service.ts`, `listening/listening.service.ts`, `apps/api/src/quiz/quiz.service.ts`

**Analog:** `apps/api/src/grammar/grammar.service.ts` (the existing `awardXp` call chain)

**Call-chain hook pattern** — follow the GamificationService injection pattern in grammar.service.ts lines 18-35:
```typescript
// In each service's completeSession() method, AFTER the existing awardXp() call:
//
// Current (Phase 7):
//   const xpResult = await this.gamification.awardXp(userId, xp, reason, skillArea);
//   const achievements = await this.gamification.checkAchievements(userId, event);
//
// Phase 8 addition — insert between awardXp and checkAchievements:
//   const xpResult = await this.gamification.awardXp(userId, xp, reason, skillArea);
//   await this.adaptive.updateSkillScore(userId, skillArea, accuracy); // NEW
//   const achievements = await this.gamification.checkAchievements(userId, event);

// Constructor injection — add AdaptiveService alongside GamificationService:
constructor(
  private readonly prisma: PrismaService,
  private readonly gamification: GamificationService,
  private readonly adaptive: AdaptiveService, // NEW
) {}
```

---

## Shared Patterns

### Authentication (JwtAuthGuard)
**Source:** `apps/api/src/auth/jwt-auth.guard.ts` (all 55 lines)
**Apply to:** All new NestJS controller endpoints (adaptive, search, analytics)
```typescript
// Pattern: @UseGuards(JwtAuthGuard) on every @Get/@Post endpoint
// userId always from req.user.userId (JWT payload) — NEVER from path/query params
// jwt-auth.guard.ts uses @auth/core/jwt decode() for Auth.js JWE tokens
```

### Admin Authorization (RolesGuard + @Roles decorator)
**Source:** `apps/api/src/auth/roles.guard.ts` + `apps/api/src/auth/roles.decorator.ts` (new files, but pattern from RESEARCH.md Pattern 3)
**Apply to:** `GET /api/admin/analytics` endpoint in analytics.controller.ts
```typescript
// Order matters: @UseGuards(JwtAuthGuard, RolesGuard) — JwtAuthGuard runs first, populates req.user
// Use 'ADMIN' string literal (not 'USER' — UserRole enum is STUDENT | ADMIN per Pitfall 3)
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
@Get('admin')
```

### NestJS Module Export (cross-module service injection)
**Source:** `apps/api/src/gamification/gamification.module.ts` lines 17-23
**Apply to:** AdaptiveModule (must export AdaptiveService so Grammar/Vocab/Reading/Listening/Quiz modules can inject it)
```typescript
@Module({
  imports: [AuthModule],
  controllers: [AdaptiveController],
  providers: [AdaptiveService],
  exports: [AdaptiveService], // REQUIRED: other modules inject AdaptiveService
})
```

### Next.js Relay Route (server-side proxy to NestJS)
**Source:** `apps/web/src/app/api/profile/me/route.ts` (all 37 lines)
**Apply to:** All 5 new relay routes under `apps/web/src/app/api/`
```typescript
// Pattern: auth() → 401 if no session → headers() → fetchWithAuth(cookieHeader, nestUrl)
// Error handling: res.ok check → res.text() for error message → NextResponse.json with status
// Use INTERNAL_API_URL (not API_URL) for server-side fetches (internal Docker network)
```

### Server Component Page (auth-gated + data fetch)
**Source:** `apps/web/src/app/(dashboard)/reading/page.tsx` lines 1-93
**Apply to:** All 4 new dashboard page components (dashboard, search, analytics, admin)
```typescript
// Pattern: auth() → redirect('/login') if no session
//          headers() → cookieHeader → fetchWithAuth(cookieHeader, INTERNAL_API_URL + path)
//          Graceful fallback: res.ok ? await res.json() : defaultValue
//          searchParams: Promise<{...}> prop for URL-driven pages (search, analytics)
```

### Client Component with "use client"
**Source:** `apps/web/src/components/gamification/xp-progress-bar.tsx` (all 42 lines)
**Apply to:** All chart components (skill-radar-chart, activity-bar-chart, cefr-progression-chart, learning-time-chart, activity-heatmap), search filters, top-nav-search
```typescript
// Pattern: "use client" directive at top of file
// Interface definition for props
// Named export (not default)
// cn() utility from "@/lib/utils" for className merging
// CRITICAL for charts: wrap ResponsiveContainer in div with explicit height={{ height: 220 }}
```

### URL-Driven Filter Component
**Source:** `apps/web/src/app/(dashboard)/reading/reading-filters.tsx` (all 142 lines)
**Apply to:** `apps/web/src/components/search/search-filters.tsx`, `apps/web/src/components/search/top-nav-search.tsx`
```typescript
// Pattern: "use client" + useRouter + useSearchParams
// buildUrl callback: const params = new URLSearchParams(searchParams.toString())
// params.delete("page") on filter change to reset pagination
// router.push(buildUrl({ filterKey: value }))
```

### shadcn Card layout
**Source:** `apps/web/src/components/ui/card.tsx` (all 77 lines)
**Apply to:** All dashboard cards, search result cards, analytics containers
```typescript
// Pattern: Card > CardHeader + CardContent
// className="rounded-xl border bg-card text-card-foreground shadow"
// Import: import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
```

---

## No Analog Found

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| `apps/web/src/components/analytics/activity-heatmap.tsx` | component (client) | — | `react-activity-calendar` not yet used anywhere in codebase; use RESEARCH.md Pattern 6 directly |
| `apps/api/src/analytics/redis-cache.service.ts` | service | request-response | No existing ioredis NestJS provider in apps/api; closest analog is profile.service.ts external-client init. Use RESEARCH.md Pattern 4. `ioredis` must be installed: `pnpm --filter @repo/api add ioredis` |

---

## Critical Pitfall Reminders (from RESEARCH.md)

These pitfalls directly affect pattern application:

1. **GrammarLesson field:** Use `explanation` not `content` in GIN index SQL and FTS query UNION ALL block.
2. **ListeningContent naming:** Model is `ListeningContent`, transcript field is `transcriptText` (not `ListeningItem`/`transcript`).
3. **UserRole enum values:** Use `'ADMIN'` and `'STUDENT'` string literals (not `'USER'`). Confirmed in `apps/web/src/auth.ts` line 65.
4. **UserRole already exists:** Do NOT create a migration for `UserRole` enum or `User.role` — both exist in schema already. Only new migration needed: `CefrHistory` model + GIN indexes.
5. **Recharts hydration:** All Recharts components need `"use client"` and `h-[220px]` wrapper div.
6. **ioredis not in apps/api:** Install before implementing AnalyticsModule.

---

## Metadata

**Analog search scope:** `apps/api/src/`, `apps/web/src/`, `packages/shared/src/`
**Files scanned:** ~65 source files
**Pattern extraction date:** 2026-06-20
