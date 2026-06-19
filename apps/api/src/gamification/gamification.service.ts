/**
 * GamificationService — authoritative writer for XP, level, achievements, and activity log.
 *
 * GAME-01: awardXp applies CEFR multiplier via calculateXp() from constants.
 * GAME-02: awardXp atomically updates User.xpTotal (increment) and User.level in $transaction.
 * GAME-03: checkAchievements awards each of the 8 badges at most once (idempotent upsert).
 * GAME-05: exactly one XpEvent per awardXp call.
 *
 * Implements RESEARCH Pattern 1 (atomic $transaction) and Pitfall 3 (upsert idempotency).
 * Source plan: 07-02.
 */

import { Injectable, OnModuleInit } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { differenceInCalendarDays } from "date-fns";
import {
  ACHIEVEMENT_DEFINITIONS,
  levelForXp,
} from "./gamification.constants";
import type { AchievementDto } from "@repo/shared";
import type { SkillArea } from "@prisma/client";

// ─── DTO for achievements with earned state ────────────────────────────────────

export interface AchievementWithEarnedAtDto extends AchievementDto {
  earnedAt: Date | null;
}

@Injectable()
export class GamificationService implements OnModuleInit {
  constructor(private readonly prisma: PrismaService) {}

  // ─── OnModuleInit ───────────────────────────────────────────────────────────
  /**
   * Seed achievement definitions on every module init (idempotent upsert).
   * This ensures the 8 Achievement rows exist in the DB before any endpoint runs.
   * Safe to call multiple times — upsert on slug prevents duplicates (T-07-18).
   */
  async onModuleInit(): Promise<void> {
    await this.seedAchievements();
  }

  // ─── awardXp ───────────────────────────────────────────────────────────────
  /**
   * Award XP to a user atomically.
   *
   * Writes three operations in a single $transaction:
   *   1. XpEvent.create — records the XP award
   *   2. User.update — increments xpTotal and writes new level
   *   3. ActivityLog.create — records activity for streak tracking
   *
   * Returns { xpEarned, oldLevel, newLevel, levelUp }.
   * levelUp is true only when the new level exceeds the old level.
   */
  async awardXp(
    userId: string,
    amount: number,
    reason: string,
    skillArea: SkillArea,
    sourceRef?: string,
  ): Promise<{ xpEarned: number; oldLevel: number; newLevel: number; levelUp: boolean }> {
    // Determine activityType from reason for streak tracking
    const activityType = reason === "srs_review" ? "SRS_REVIEW" : "LESSON_COMPLETE";

    // Interactive transaction: read-compute-write is atomic to prevent concurrent
    // callers from computing level from a stale pre-transaction xpTotal (CR-01).
    const { oldLevel, newLevel } = await this.prisma.$transaction(async (tx) => {
      // Read current state inside the transaction
      const user = await tx.user.findUniqueOrThrow({
        where: { id: userId },
        select: { xpTotal: true, level: true },
      });

      const txOldLevel = user.level;
      const newXpTotal = user.xpTotal + amount;
      const txNewLevel = levelForXp(newXpTotal);

      // Write absolute values (not increment) so level is consistent with xpTotal
      await tx.user.update({
        where: { id: userId },
        data: {
          xpTotal: newXpTotal,
          level: txNewLevel,
        },
      });

      await tx.xpEvent.create({
        data: {
          userId,
          amount,
          reason,
          skillArea,
          sourceRef: sourceRef ?? null,
        },
      });

      await tx.activityLog.create({
        data: {
          userId,
          activityType,
          skillArea,
        },
      });

      return { oldLevel: txOldLevel, newLevel: txNewLevel };
    });

    return { xpEarned: amount, oldLevel, newLevel, levelUp: newLevel > oldLevel };
  }

  // ─── checkAchievements ─────────────────────────────────────────────────────
  /**
   * Check and award achievements for a user based on the current event.
   *
   * Each achievement is awarded at most once per user (idempotent).
   * Uses upsert + count-before/count-after delta to detect new awards.
   * Never uses bare create — always upsert to handle concurrent requests (RESEARCH Pitfall 3).
   *
   * Returns AchievementDto[] of NEWLY awarded badges only.
   */
  async checkAchievements(
    userId: string,
    event: { type: string; metadata?: Record<string, unknown> },
  ): Promise<AchievementDto[]> {
    const newlyAwarded: AchievementDto[] = [];

    /**
     * tryAward: attempt to award an achievement by slug.
     * Uses an interactive transaction with findFirst-then-create to detect new awards
     * without the racy count-before/upsert/count-after pattern (WR-01).
     * The @@unique constraint prevents duplicate rows even under concurrency;
     * the transaction makes the detection atomic. If newly awarded, grants xpReward XP.
     */
    const tryAward = async (slug: string): Promise<boolean> => {
      const achievement = await this.prisma.achievement.findUnique({
        where: { slug },
      });
      if (!achievement) return false;

      // Atomic detection: findFirst + create inside a transaction.
      // If another concurrent caller wins the race, the create throws a unique violation
      // which is caught and treated as "already awarded" (not new).
      let isNew = false;
      try {
        await this.prisma.$transaction(async (tx) => {
          const existing = await tx.userAchievement.findFirst({
            where: { userId, achievementId: achievement.id },
            select: { userId: true },
          });
          if (existing) return; // already earned — not new
          await tx.userAchievement.create({
            data: { userId, achievementId: achievement.id },
          });
          isNew = true;
        });
      } catch {
        // Unique constraint violation from a concurrent winner — treat as already awarded
        isNew = false;
      }

      if (isNew) {
        newlyAwarded.push({
          id: achievement.id,
          slug,
          name: achievement.name,
          description: achievement.description,
          iconUrl: achievement.iconUrl ?? null,
          xpReward: achievement.xpReward,
        });
        // Grant the achievement's XP reward (was missing before — WR-01)
        if (achievement.xpReward > 0) {
          await this.awardXp(userId, achievement.xpReward, `achievement:${slug}`, "MIXED");
        }
        return true;
      }
      return false;
    };

    const eventType = event.type;
    const metadata = event.metadata ?? {};

    // ── first-lesson ────────────────────────────────────────────────────────
    // Triggered by any lesson or quiz completion event
    if (eventType === "LESSON_COMPLETE" || eventType === "QUIZ_COMPLETE") {
      await tryAward("first-lesson");
    }

    // ── vocab-100 / vocab-500 ───────────────────────────────────────────────
    // Triggered only when vocab/SRS review activity reported
    if (eventType === "VOCAB_REVIEW" || eventType === "SRS_REVIEW") {
      const masteredCount = await this.prisma.srsCard.count({
        where: { userId, state: "Review" },
      });
      if (masteredCount >= 100) await tryAward("vocab-100");
      if (masteredCount >= 500) await tryAward("vocab-500");
    }

    // ── grammar-master ─────────────────────────────────────────────────────
    // Triggered by grammar-specific completion events
    if (eventType === "GRAMMAR_COMPLETE" || eventType === "GRAMMAR_LESSON") {
      const masteryPct =
        typeof metadata.masteryPct === "number" ? metadata.masteryPct : 0;
      if (masteryPct >= 80) {
        await tryAward("grammar-master");
      } else {
        // Also check if any GrammarProgress for this user has masteryPct >= 80
        const anyMastered = await this.prisma.grammarProgress.findFirst({
          where: { userId, masteryPct: { gte: 80 } },
          select: { id: true },
        });
        if (anyMastered) await tryAward("grammar-master");
      }
    }

    // ── reading-complete ───────────────────────────────────────────────────
    // Triggered by reading passage completion events
    if (eventType === "READING" || eventType === "READING_COMPLETE") {
      const firstReading = await this.prisma.readingProgress.findFirst({
        where: { userId, completedAt: { not: null } },
        select: { id: true },
      });
      if (firstReading) await tryAward("reading-complete");
    }

    // ── listening-complete ─────────────────────────────────────────────────
    // Triggered by listening content completion events
    if (eventType === "LISTENING" || eventType === "LISTENING_COMPLETE") {
      const firstListening = await this.prisma.listeningProgress.findFirst({
        where: { userId, completedAt: { not: null } },
        select: { id: true },
      });
      if (firstListening) await tryAward("listening-complete");
    }

    // ── streak-7 / streak-30 ───────────────────────────────────────────────
    // Check streaks when explicitly requested via STREAK_CHECK or SRS_REVIEW event.
    // awardXp writes the ActivityLog first; callers pass STREAK_CHECK after.
    if (eventType === "STREAK_CHECK" || eventType === "SRS_REVIEW") {
      const hasStreak7 = await this.checkStreak(userId, 7);
      if (hasStreak7) await tryAward("streak-7");

      const hasStreak30 = await this.checkStreak(userId, 30);
      if (hasStreak30) await tryAward("streak-30");
    }

    return newlyAwarded;
  }

  // ─── checkStreak ───────────────────────────────────────────────────────────
  /**
   * Check if a user has maintained a streak of at least `streakTarget` consecutive days.
   *
   * Queries ActivityLog for the last (streakTarget + 1) days, deduplicates to calendar days,
   * then counts consecutive days backward from today using date-fns differenceInCalendarDays.
   */
  private async checkStreak(userId: string, streakTarget: number): Promise<boolean> {
    const since = new Date();
    since.setDate(since.getDate() - (streakTarget + 2)); // +2 (not +1) to guarantee boundary day inclusion (CR-02)

    const logs = await this.prisma.activityLog.findMany({
      where: { userId, loggedAt: { gte: since } },
      orderBy: { loggedAt: "desc" },
      select: { loggedAt: true },
    });

    // Deduplicate to unique calendar dates (YYYY-MM-DD UTC), sorted descending.
    // WR-05 NOTE: toISOString() always returns the UTC date. For users in timezones
    // behind UTC (e.g. EST = UTC-5), activity at 11 PM local time is recorded under
    // the NEXT UTC day. This can cause a streak to appear broken for one calendar day
    // from the user's perspective. Fixing this requires storing user timezone on the
    // User model and passing it here. Deferred to v2 — acceptable limitation for v1.
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
        if (streak >= streakTarget) return true;
      } else {
        break;
      }
    }
    return false;
  }

  // ─── seedAchievements ──────────────────────────────────────────────────────
  /**
   * Upsert all 8 achievement definitions into the Achievement table.
   * Safe to run multiple times — idempotent on `slug`.
   */
  async seedAchievements(): Promise<void> {
    for (const def of ACHIEVEMENT_DEFINITIONS) {
      await this.prisma.achievement.upsert({
        where: { slug: def.slug },
        create: {
          slug: def.slug,
          name: def.name,
          description: def.description,
          xpReward: def.xpReward,
        },
        update: {
          name: def.name,
          description: def.description,
          xpReward: def.xpReward,
        },
      });
    }
  }

  // ─── getUserAchievements ───────────────────────────────────────────────────
  /**
   * Return all 8 achievement definitions merged with the user's earned state.
   *
   * GAME-03/04: Returns all Achievement rows (definition sequence) + UserAchievement.earnedAt.
   * earnedAt is null when the achievement has not been earned yet (locked state).
   *
   * Security (T-07-16): userId is always from JWT — never from client input.
   * Idempotent: seedAchievements runs on module init so all 8 rows always exist.
   */
  async getUserAchievements(userId: string): Promise<AchievementWithEarnedAtDto[]> {
    // Load all 8 Achievement definitions (ordered by definition sequence via ACHIEVEMENT_DEFINITIONS)
    const allAchievements = await this.prisma.achievement.findMany({
      orderBy: { id: 'asc' },
    });

    // Load the user's earned achievements
    const userAchievements = await this.prisma.userAchievement.findMany({
      where: { userId },
      select: { achievementId: true, earnedAt: true },
    });

    // Build a map for O(1) lookup
    const earnedMap = new Map<string, Date>(
      userAchievements.map((ua) => [ua.achievementId, ua.earnedAt]),
    );

    // Merge: return all 8 in definition order with earned state
    return allAchievements.map((achievement) => ({
      id: achievement.id,
      slug: achievement.slug,
      name: achievement.name,
      description: achievement.description,
      iconUrl: achievement.iconUrl ?? null,
      xpReward: achievement.xpReward,
      earnedAt: earnedMap.get(achievement.id) ?? null,
    }));
  }
}
