// apps/api/src/analytics/analytics.service.ts
// AnalyticsService — student analytics (ANLT-01) and admin analytics (ANLT-02).
//
// Security:
//   T-08-10: getStudentAnalytics() takes userId from JWT only (IDOR prevention)
//   T-08-11: getAdminAnalytics() uses Redis cache-aside to prevent expensive query DoS
//
// Patterns:
//   RESEARCH.md Pattern 4 — Redis cache-aside with 'admin:analytics:v1' key, TTL 300s
//   RESEARCH.md Pattern 6 — Activity heatmap level mapping (D-16)
//   D-16: 0=0, 1-3=1, 4-7=2, 8-10=3, 11+=4

import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RedisCacheService } from './redis-cache.service';
import { format, subDays, startOfDay, eachDayOfInterval } from 'date-fns';
import type {
  AnalyticsDto,
  AdminAnalyticsDto,
  CefrProgressionPoint,
  VocabRetentionPoint,
  LearningTimePoint,
  ActivityHeatmapPoint,
  SkillScoreDto,
} from '@repo/shared';

// D-16: Activity heatmap level mapping
function toHeatmapLevel(count: number): 0 | 1 | 2 | 3 | 4 {
  if (count === 0) return 0;
  if (count <= 3) return 1;
  if (count <= 7) return 2;
  if (count <= 10) return 3;
  return 4;
}

// CEFR level to numeric mapping (B1=1, B2=2, C1=3)
function cefrToNumeric(level: string): 1 | 2 | 3 {
  if (level === 'B1') return 1;
  if (level === 'B2') return 2;
  return 3;
}

@Injectable()
export class AnalyticsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redisCache: RedisCacheService,
  ) {}

  // ---------------------------------------------------------------------------
  // ANLT-01: Student Analytics
  // ---------------------------------------------------------------------------

  async getStudentAnalytics(userId: string): Promise<AnalyticsDto> {
    const [
      cefrHistoryRows,
      srsCards,
      xpEvents,
      activityLogs,
      skillScoreRows,
    ] = await Promise.all([
      // CefrHistory ordered by recordedAt — used for CEFR progression chart
      this.prisma.cefrHistory.findMany({
        where: { userId },
        orderBy: { recordedAt: 'asc' },
      }),
      // SrsCard recall for vocab retention (reps = successful reviews proxy)
      this.prisma.srsCard.findMany({
        where: { userId },
        select: { reps: true, lapses: true, lastReview: true, createdAt: true },
      }),
      // XpEvent by day as learning-time proxy
      this.prisma.xpEvent.findMany({
        where: { userId },
        select: { createdAt: true, amount: true },
      }),
      // ActivityLog for heatmap (last 365 days)
      this.prisma.activityLog.findMany({
        where: {
          userId,
          loggedAt: { gte: subDays(new Date(), 365) },
        },
        select: { loggedAt: true },
      }),
      // SkillScore for skill breakdown (ANLT-01)
      this.prisma.skillScore.findMany({
        where: { userId },
        select: { skillArea: true, accuracy: true, isWeak: true },
      }),
    ]);

    // ── CEFR Progression ───────────────────────────────────────────────────
    // Group by month, take the last recorded level in each month
    const safecefrRows = cefrHistoryRows ?? [];
    const cefrByMonth = new Map<string, 1 | 2 | 3>();
    for (const row of safecefrRows) {
      const month = format(row.recordedAt, 'MMM yyyy');
      cefrByMonth.set(month, cefrToNumeric(row.cefrLevel));
    }
    const cefrProgression: CefrProgressionPoint[] = Array.from(
      cefrByMonth.entries(),
    ).map(([month, level]) => ({ month, level }));

    // ── Vocab Retention ────────────────────────────────────────────────────
    // Group SrsCards by week of creation; compute recall rate = reps / (reps + lapses)
    const safeCards = srsCards ?? [];
    const weekMap = new Map<string, { correct: number; total: number }>();
    for (const card of safeCards) {
      if (!card.lastReview) continue;
      const weekLabel = format(card.createdAt, "'Week' w, yyyy");
      const entry = weekMap.get(weekLabel) ?? { correct: 0, total: 0 };
      entry.correct += card.reps;
      entry.total += card.reps + card.lapses;
      weekMap.set(weekLabel, entry);
    }
    const vocabRetention: VocabRetentionPoint[] = Array.from(
      weekMap.entries(),
    ).map(([week, { correct, total }]) => ({
      week,
      rate: total > 0 ? correct / total : 0,
    }));

    // ── Learning Time ──────────────────────────────────────────────────────
    // Group XpEvents by day; estimate minutes as XP / 10 (10 XP ≈ 1 minute proxy)
    const safeXpEvents = xpEvents ?? [];
    const dayMap = new Map<string, number>();
    for (const ev of safeXpEvents) {
      const date = format(ev.createdAt, 'yyyy-MM-dd');
      dayMap.set(date, (dayMap.get(date) ?? 0) + Math.max(1, Math.round(ev.amount / 10)));
    }
    const learningTime: LearningTimePoint[] = Array.from(dayMap.entries()).map(
      ([date, minutes]) => ({ date, minutes }),
    );

    // ── Activity Heatmap ───────────────────────────────────────────────────
    // ActivityLog grouped by date for last 365 days; level via D-16 mapping
    const safeLogs = activityLogs ?? [];
    const activityCountByDate = new Map<string, number>();
    for (const log of safeLogs) {
      const date = format(log.loggedAt, 'yyyy-MM-dd');
      activityCountByDate.set(date, (activityCountByDate.get(date) ?? 0) + 1);
    }

    // Fill in all 365 days (including zeros for missing dates)
    const today = startOfDay(new Date());
    const yearAgo = subDays(today, 364);
    const allDays = eachDayOfInterval({ start: yearAgo, end: today });
    const activityHeatmap: ActivityHeatmapPoint[] = allDays.map((day) => {
      const date = format(day, 'yyyy-MM-dd');
      const count = activityCountByDate.get(date) ?? 0;
      return { date, count, level: toHeatmapLevel(count) };
    });

    // ── Skill Breakdown ────────────────────────────────────────────────────
    // ANLT-01: SkillScore.findMany for the user → SkillScoreDto[]
    const safeScores = skillScoreRows ?? [];
    const skillBreakdown: SkillScoreDto[] = safeScores.map((s) => ({
      skillArea: s.skillArea as string,
      accuracy: s.accuracy,
      isWeak: s.isWeak,
    }));

    return {
      cefrProgression,
      vocabRetention,
      learningTime,
      activityHeatmap,
      skillBreakdown,
    };
  }

  // ---------------------------------------------------------------------------
  // ANLT-02: Admin Analytics (cache-aside, Redis TTL 5 min)
  // ---------------------------------------------------------------------------

  async getAdminAnalytics(): Promise<AdminAnalyticsDto> {
    const cacheKey = 'admin:analytics:v1';

    // Cache hit — return without running expensive queries
    const cached = await this.redisCache.get<AdminAnalyticsDto>(cacheKey);
    if (cached) return cached;

    // Cache miss — compute and store
    const data = await this.computeAdminAnalytics();
    await this.redisCache.set(cacheKey, data, 300); // TTL 5 minutes
    return data;
  }

  private async computeAdminAnalytics(): Promise<AdminAnalyticsDto> {
    const now = new Date();
    const oneDayAgo = subDays(now, 1);
    const sevenDaysAgo = subDays(now, 7);
    const thirtyDaysAgo = subDays(now, 30);

    // ── DAU / WAU / MAU ────────────────────────────────────────────────────
    // Count distinct users active in ActivityLog within each window
    const [dauRows, wauRows, mauRows] = await Promise.all([
      this.prisma.activityLog.groupBy({
        by: ['userId'] as ['userId'],
        where: { loggedAt: { gte: oneDayAgo } },
      }),
      this.prisma.activityLog.groupBy({
        by: ['userId'] as ['userId'],
        where: { loggedAt: { gte: sevenDaysAgo } },
      }),
      this.prisma.activityLog.groupBy({
        by: ['userId'] as ['userId'],
        where: { loggedAt: { gte: thirtyDaysAgo } },
      }),
    ]);

    const dau = (dauRows ?? []).length;
    const wau = (wauRows ?? []).length;
    const mau = (mauRows ?? []).length;

    // ── Week-2 Retention Rate ──────────────────────────────────────────────
    // CR-05: Scope week2Active to users in the day-14–21 cohort only.
    // Users signed up 14-21 days ago vs active during their second week.
    const week2Start = subDays(now, 21);
    const week2End = subDays(now, 14);
    const cohortUsers = await this.prisma.user.findMany({
      where: { createdAt: { gte: week2Start, lt: week2End } },
      select: { id: true },
    });
    const cohortIds = cohortUsers.map((u) => u.id);
    const cohortTotal = cohortIds.length;
    const week2ActiveRows = cohortTotal > 0
      ? await this.prisma.activityLog.groupBy({
          by: ['userId'] as ['userId'],
          where: { userId: { in: cohortIds }, loggedAt: { gte: week2End, lt: now } },
        })
      : [];

    const retentionRate =
      cohortTotal > 0
        ? Math.min((week2ActiveRows ?? []).length / cohortTotal, 1)
        : 0;

    // ── Top Content ────────────────────────────────────────────────────────
    // CR-04: Use DB-level groupBy+_count instead of full table scan in process.
    // WR-07: Batch-fetch passage titles instead of exposing raw passageId cuid.
    const ninetyDaysAgo = subDays(now, 90);
    const topPassageGroups = await this.prisma.readingProgress.groupBy({
      by: ['passageId'],
      where: { completedAt: { not: null, gte: ninetyDaysAgo } },
      _count: { passageId: true },
      orderBy: { _count: { passageId: 'desc' } },
      take: 10,
    });

    const topPassageIds = topPassageGroups.map((g) => g.passageId);
    const topPassages = await this.prisma.readingPassage.findMany({
      where: { id: { in: topPassageIds } },
      select: { id: true, title: true },
    });
    const titleById = new Map(topPassages.map((p) => [p.id, p.title]));

    const topContent = topPassageGroups.map((g) => ({
      title: titleById.get(g.passageId) ?? g.passageId,
      module: 'reading',
      completions: g._count.passageId,
    }));

    // ── Completion Rate By Module ──────────────────────────────────────────
    // ANLT-02: completed / total per module across 5 modules
    // CR-04: Use DB-level counts instead of fetching all rows.
    const thirtyDaysForActivity = subDays(now, 30);
    const [readingCompleted, readingTotal] = await Promise.all([
      this.prisma.readingProgress.count({ where: { completedAt: { not: null } } }),
      this.prisma.readingProgress.count(),
    ]);

    // For other modules use activityLog as signal — limit to last 30 days (CR-04)
    const allActivityLogs = (await this.prisma.activityLog.findMany({
      where: { loggedAt: { gte: thirtyDaysForActivity } },
      select: { activityType: true },
    })) ?? [];

    // Parse activity types by convention: {module}_complete, {module}_start, etc.
    const moduleStats = new Map<string, { started: number; completed: number }>();
    const moduleNames = ['grammar', 'vocabulary', 'listening', 'quiz'];
    for (const mod of moduleNames) {
      moduleStats.set(mod, { started: 0, completed: 0 });
    }
    for (const log of allActivityLogs) {
      const type = (log.activityType ?? '').toLowerCase();
      for (const mod of moduleNames) {
        if (type.startsWith(mod) || type.includes(mod)) {
          const entry = moduleStats.get(mod) ?? { started: 0, completed: 0 };
          if (type.includes('complete') || type.includes('finish') || type.endsWith('_done')) {
            entry.completed++;
          } else {
            entry.started++;
          }
          moduleStats.set(mod, entry);
          break;
        }
      }
    }

    const completionRateByModule = [
      {
        module: 'grammar',
        rate: computeModuleRate(moduleStats.get('grammar')),
      },
      {
        module: 'vocabulary',
        rate: computeModuleRate(moduleStats.get('vocabulary')),
      },
      {
        module: 'reading',
        rate: readingTotal > 0 ? readingCompleted / readingTotal : 0,
      },
      {
        module: 'listening',
        rate: computeModuleRate(moduleStats.get('listening')),
      },
      {
        module: 'quiz',
        rate: computeModuleRate(moduleStats.get('quiz')),
      },
    ];

    // ── User Growth ────────────────────────────────────────────────────────
    // Simplified: total user count today
    const totalUsers = await this.prisma.user.count();
    const userGrowth = [
      { date: format(now, 'yyyy-MM-dd'), total: totalUsers ?? 0 },
    ];

    return {
      dau,
      wau,
      mau,
      retentionRate,
      topContent,
      completionRateByModule,
      userGrowth,
      lastUpdated: now.toISOString(),
    };
  }
}

function computeModuleRate(
  entry: { started: number; completed: number } | undefined,
): number {
  if (!entry) return 0;
  const total = entry.started + entry.completed;
  return total > 0 ? entry.completed / total : 0;
}
