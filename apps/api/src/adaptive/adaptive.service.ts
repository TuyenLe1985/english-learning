/**
 * AdaptiveService — adaptive learning engine backend.
 *
 * ADPT-01: updateSkillScore() blends accuracy using EMA (alpha=0.3).
 * ADPT-02: sets isWeak=true when blended accuracy < 0.6.
 * ADPT-03: getContinueLearningRecommendation() returns lowest-accuracy weak skill (tie-break updatedAt desc).
 * ADPT-04: returns recommendedNextTier when no weak skills found (D-06 — informational only, no gating).
 * ADPT-05: getContinueLearningRecommendation() returns preThreshold=true when ActivityLog < 5.
 * DASH-01/02/04: getDashboardData() aggregates all dashboard fields.
 *
 * Security (T-08-02, T-08-03): userId always from JWT — never from request.
 */

import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { differenceInCalendarDays } from 'date-fns';
import type { SkillArea, CefrLevel } from '@repo/database';
import type { DashboardDto, ContinueLearningDto, SkillScoreDto, ContentItemDto } from '@repo/shared';

// EMA alpha: 0.3 blends new accuracy into history with 30% weight
const EMA_ALPHA = 0.3;
// Weak threshold: accuracy below this value sets isWeak=true (D-08)
const WEAK_THRESHOLD = 0.6;
// Max items for recently viewed and bookmarked sections
const RECENT_LIMIT = 4;

// CEFR level ordering for next-tier recommendation (D-06 — informational only, no gating)
const CEFR_NEXT: Record<string, string | undefined> = {
  B1: 'B2',
  B2: 'C1',
  C1: undefined, // already at top tier
};

@Injectable()
export class AdaptiveService {
  constructor(private readonly prisma: PrismaService) {}

  // ─── updateSkillScore ──────────────────────────────────────────────────────
  /**
   * ADPT-01/02: Upsert SkillScore with EMA-blended accuracy.
   *
   * First call (no existing record): accuracy = incoming value directly.
   * Subsequent calls: newAccuracy = existing * (1 - alpha) + incoming * alpha.
   * isWeak = newAccuracy < WEAK_THRESHOLD.
   *
   * Uses @@unique userId_skillArea constraint for upsert.
   */
  async updateSkillScore(
    userId: string,
    skillArea: SkillArea,
    accuracy: number,
  ): Promise<void> {
    // CR-02: Use a Prisma transaction to make the read-modify-write atomic,
    // preventing lost updates when concurrent sessions complete simultaneously.
    await this.prisma.$transaction(async (tx) => {
      const existing = await tx.skillScore.findUnique({
        where: { userId_skillArea: { userId, skillArea } },
        select: { accuracy: true },
      });

      const newAccuracy = existing
        ? existing.accuracy * (1 - EMA_ALPHA) + accuracy * EMA_ALPHA
        : accuracy;

      const isWeak = newAccuracy < WEAK_THRESHOLD;

      await tx.skillScore.upsert({
        where: { userId_skillArea: { userId, skillArea } },
        create: {
          userId,
          skillArea,
          accuracy: newAccuracy,
          isWeak,
        },
        update: {
          accuracy: newAccuracy,
          isWeak,
        },
      });
    });
  }

  // ─── getContinueLearningRecommendation ─────────────────────────────────────
  /**
   * ADPT-03/04/05: Return a Continue Learning recommendation.
   *
   * Pre-threshold (< 5 ActivityLog entries): returns {preThreshold:true}.
   * Post-threshold: finds lowest-accuracy isWeak skill (tie-break updatedAt desc).
   * No weak skills: returns {preThreshold:false, recommendedNextTier} where
   * recommendedNextTier is the next CEFR tier above the user's current level
   * (D-06 — informational only, no gating). Callers supply cefrLevel for this lookup.
   *
   * NOTE: recommendedNextTier is always present in the result object (may be undefined)
   * to satisfy the ADPT-04 type contract ("recommendedNextTier" in result === true).
   */
  async getContinueLearningRecommendation(
    userId: string,
    cefrLevel?: string,
  ): Promise<ContinueLearningDto> {
    // ADPT-05: gate on activity count
    const activityCount = await this.prisma.activityLog.count({
      where: { userId },
    });

    if (activityCount < 5) {
      return {
        preThreshold: true,
        recommendedModule: 'GRAMMAR', // sensible default for new users
        recommendedNextTier: undefined,
      };
    }

    // ADPT-03: find lowest-accuracy weak skill, tie-break by updatedAt desc
    const weakestScore = await this.prisma.skillScore.findFirst({
      where: { userId, isWeak: true },
      orderBy: [{ accuracy: 'asc' }, { updatedAt: 'desc' }],
      select: { skillArea: true, accuracy: true, isWeak: true },
    });

    if (weakestScore) {
      return {
        preThreshold: false,
        weakestSkill: weakestScore.skillArea,
        accuracy: weakestScore.accuracy,
        recommendedModule: weakestScore.skillArea,
        recommendedNextTier: undefined,
      };
    }

    // ADPT-04: no weak skills — optionally surface next CEFR tier (informational only, D-06)
    // The recommendedNextTier key is always present in the result (may be undefined)
    // to satisfy the "recommendedNextTier" in result type contract.
    const nextTier = cefrLevel ? CEFR_NEXT[cefrLevel] : undefined;

    return {
      preThreshold: false,
      weakestSkill: undefined,
      accuracy: undefined,
      recommendedModule: undefined,
      recommendedNextTier: nextTier,
    };
  }

  // ─── getDashboardData ──────────────────────────────────────────────────────
  /**
   * DASH-01/02/04: Aggregate all dashboard data for a user.
   *
   * Includes: user stats, skill scores, lessonsCompleted, recommendation,
   * recentlyViewed (reading + listening, last 4 by lastViewedAt),
   * bookmarked (last 4 Bookmark rows with passage title/cefrLevel),
   * pendingReviews (SrsCard due count).
   *
   * Also calls recordCefrSnapshotIfChanged to maintain CefrHistory (RESEARCH Pattern 7).
   */
  async getDashboardData(userId: string): Promise<DashboardDto> {
    // Load user fields needed for the dashboard header
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: {
        name: true,
        xpTotal: true,
        level: true,
        cefrLevel: true,
      },
    });

    // Compute current streak
    const streak = await this.computeCurrentStreak(userId);

    // CR-03: Guard against null cefrLevel (e.g. legacy rows before NOT NULL constraint)
    const cefrLevel = user.cefrLevel ?? 'B1';

    // Record CEFR snapshot if level changed (Pitfall 9)
    await this.recordCefrSnapshotIfChanged(userId, cefrLevel);

    // Skill scores for radar chart
    const skillScoreRows = await this.prisma.skillScore.findMany({
      where: { userId },
      select: { skillArea: true, accuracy: true, isWeak: true },
    });

    const skillScores: SkillScoreDto[] = skillScoreRows.map((s) => ({
      skillArea: s.skillArea,
      accuracy: s.accuracy,
      isWeak: s.isWeak,
    }));

    // Lessons completed: count non-null completedAt across reading + listening + grammar + quiz
    const [readingCount, listeningCount, grammarCount, quizCount] = await Promise.all([
      this.prisma.readingProgress.count({ where: { userId, completedAt: { not: null } } }),
      this.prisma.listeningProgress.count({ where: { userId, completedAt: { not: null } } }),
      this.prisma.grammarProgress.count({ where: { userId } }),
      this.prisma.quizSession.count({ where: { userId, completedAt: { not: null } } }),
    ]);
    const lessonsCompleted = readingCount + listeningCount + grammarCount + quizCount;

    // Recommendation — pass cefrLevel so next-tier logic works without an extra query
    const recommendation = await this.getContinueLearningRecommendation(userId, cefrLevel);

    // Recently viewed: reading + listening sorted by lastViewedAt desc, last RECENT_LIMIT combined
    const [recentReading, recentListening] = await Promise.all([
      this.prisma.readingProgress.findMany({
        where: { userId },
        orderBy: { lastViewedAt: 'desc' },
        take: RECENT_LIMIT,
        select: {
          passageId: true,
          lastViewedAt: true,
          passage: { select: { title: true, cefrLevel: true } },
        },
      }),
      this.prisma.listeningProgress.findMany({
        where: { userId },
        orderBy: { lastViewedAt: 'desc' },
        take: RECENT_LIMIT,
        select: {
          contentId: true,
          lastViewedAt: true,
          content: { select: { title: true, cefrLevel: true } },
        },
      }),
    ]);

    // Merge and sort by lastViewedAt desc, take top RECENT_LIMIT
    const allRecent: Array<{
      id: string;
      title: string;
      type: string;
      cefrLevel: CefrLevel;
      lastViewedAt: Date;
    }> = [
      ...recentReading.map((r) => ({
        id: r.passageId,
        title: r.passage.title,
        type: 'reading',
        cefrLevel: r.passage.cefrLevel,
        lastViewedAt: r.lastViewedAt,
      })),
      ...recentListening.map((l) => ({
        id: l.contentId,
        title: l.content.title,
        type: 'listening',
        cefrLevel: l.content.cefrLevel,
        lastViewedAt: l.lastViewedAt,
      })),
    ]
      .sort((a, b) => b.lastViewedAt.getTime() - a.lastViewedAt.getTime())
      .slice(0, RECENT_LIMIT);

    const recentlyViewed: ContentItemDto[] = allRecent.map(({ id, title, type, cefrLevel }) => ({
      id,
      title,
      type,
      cefrLevel,
    }));

    // Bookmarked: last RECENT_LIMIT bookmarks with passage title and cefrLevel
    const bookmarkRows = await this.prisma.bookmark.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: RECENT_LIMIT,
      select: {
        passageId: true,
        passage: { select: { title: true, cefrLevel: true } },
      },
    });

    const bookmarked: ContentItemDto[] = bookmarkRows.map((b) => ({
      id: b.passageId,
      title: b.passage.title,
      type: 'reading',
      cefrLevel: b.passage.cefrLevel,
    }));

    // Pending SRS reviews: due cards count (WHERE due <= NOW())
    const pendingReviews = await this.prisma.srsCard.count({
      where: { userId, due: { lte: new Date() } },
    });

    return {
      user: {
        name: user.name ?? '',
        xpTotal: user.xpTotal,
        level: user.level,
        cefrLevel: cefrLevel,
        streak,
      },
      skillScores,
      lessonsCompleted,
      recommendation,
      recentlyViewed,
      bookmarked,
      pendingReviews,
    };
  }

  // ─── computeCurrentStreak ─────────────────────────────────────────────────
  /**
   * Compute consecutive-day streak from ActivityLog.
   *
   * Queries last 400 days (WR-01: previous 32-day cap truncated long streaks),
   * deduplicates to calendar dates, counts backward from today using
   * date-fns differenceInCalendarDays. Mirrors GamificationService.checkStreak.
   */
  private async computeCurrentStreak(userId: string): Promise<number> {
    const since = new Date();
    since.setDate(since.getDate() - 400); // WR-01: allow up to ~1 year of streak

    const logs = await this.prisma.activityLog.findMany({
      where: { userId, loggedAt: { gte: since } },
      orderBy: { loggedAt: 'desc' },
      select: { loggedAt: true },
    });

    // Deduplicate to unique calendar dates (UTC), sorted descending
    const days = [
      ...new Set(logs.map((l) => l.loggedAt.toISOString().slice(0, 10))),
    ]
      .sort()
      .reverse();

    let streak = 0;
    for (let i = 0; i < days.length; i++) {
      const prev = i === 0 ? new Date() : new Date(days[i - 1]!);
      const curr = new Date(days[i]!);
      if (
        differenceInCalendarDays(prev, curr) === 1 ||
        (i === 0 && differenceInCalendarDays(new Date(), curr) <= 1)
      ) {
        streak++;
      } else {
        break;
      }
    }
    return streak;
  }

  // ─── recordCefrSnapshotIfChanged ──────────────────────────────────────────
  /**
   * Write a CefrHistory row only when cefrLevel differs from the most recent entry.
   * Pitfall 9: avoid duplicate CefrHistory rows when cefrLevel is unchanged.
   */
  private async recordCefrSnapshotIfChanged(
    userId: string,
    currentLevel: CefrLevel,
  ): Promise<void> {
    const latest = await this.prisma.cefrHistory.findFirst({
      where: { userId },
      orderBy: { recordedAt: 'desc' },
      select: { cefrLevel: true },
    });

    if (latest?.cefrLevel !== currentLevel) {
      await this.prisma.cefrHistory.create({
        data: { userId, cefrLevel: currentLevel },
      });
    }
  }
}
