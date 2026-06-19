/**
 * Gamification constants — XP rates, CEFR multipliers, achievement definitions.
 * Source: .planning/phases/07-quiz-center-gamification/07-PATTERNS.md §gamification.constants.ts
 * Decisions: D-09 (level formula), D-10 (XP rates), D-13 (achievement list)
 *
 * All constants are server-side only — NEVER client-supplied. (T-07-01)
 */

// ─── XP Rates ──────────────────────────────────────────────────────────────────

export const XP_RATES = {
  QUIZ_CORRECT: 5,
  QUIZ_SESSION_BONUS: 10,
  LESSON_COMPLETE: 20,
  SRS_REVIEW: 3, // flat — no CEFR multiplier (D-10)
} as const;

// ─── CEFR Multipliers ─────────────────────────────────────────────────────────

export const CEFR_MULTIPLIERS: Record<string, number> = {
  B1: 1.0,
  B2: 1.5,
  C1: 2.0,
};

// ─── XP Calculation ───────────────────────────────────────────────────────────

export function calculateXp(baseRate: number, cefrLevel: string): number {
  const multiplier = CEFR_MULTIPLIERS[cefrLevel] ?? 1.0;
  return Math.round(baseRate * multiplier);
}

// ─── Level Formula (D-09) ─────────────────────────────────────────────────────

/**
 * Calculate level from total XP.
 * Formula: level = min(100, floor(xpTotal / 100) + 1)
 * Examples: xpTotal=0 → 1, xpTotal=100 → 2, xpTotal=9900 → 100, xpTotal=99999 → 100
 */
export function levelForXp(xpTotal: number): number {
  return Math.min(100, Math.floor(xpTotal / 100) + 1);
}

// ─── Achievement Definitions (D-13) ───────────────────────────────────────────

export const ACHIEVEMENT_DEFINITIONS = [
  {
    slug: "first-lesson",
    name: "First Step",
    description: "Complete your first lesson",
    xpReward: 10,
  },
  {
    slug: "vocab-100",
    name: "Word Collector",
    description: "Learn 100 vocabulary words",
    xpReward: 50,
  },
  {
    slug: "vocab-500",
    name: "Lexicon Builder",
    description: "Learn 500 vocabulary words",
    xpReward: 200,
  },
  {
    slug: "grammar-master",
    name: "Grammar Master",
    description: "Score 80%+ on a grammar topic",
    xpReward: 100,
  },
  {
    slug: "reading-complete",
    name: "First Reader",
    description: "Complete your first reading passage",
    xpReward: 20,
  },
  {
    slug: "listening-complete",
    name: "First Listener",
    description: "Complete your first listening exercise",
    xpReward: 20,
  },
  {
    slug: "streak-7",
    name: "Week Warrior",
    description: "7 consecutive days of practice",
    xpReward: 75,
  },
  {
    slug: "streak-30",
    name: "Monthly Champion",
    description: "30 consecutive days of practice",
    xpReward: 500,
  },
] as const;
