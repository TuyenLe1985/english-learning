/**
 * AchievementGrid — 4-column (md+) / 2-column (mobile) grid of 8 achievement badges.
 *
 * GAME-03/04: Displays all 8 achievements ordered by definition sequence.
 * Locked achievements show the lock icon + "Locked" text.
 * Earned achievements show the trophy icon + earned date.
 *
 * Empty state: "Complete lessons and quizzes to earn achievement badges."
 * (shown when achievements array is empty, which shouldn't happen since we
 *  always return all 8 from the API)
 */

"use client";

import { AchievementBadge } from "@/components/gamification/achievement-badge";

interface UserAchievement {
  id: string;
  slug: string;
  name: string;
  description: string;
  iconUrl: string | null;
  xpReward: number;
  earnedAt: Date | string | null;
}

interface AchievementGridProps {
  achievements: UserAchievement[];
}

export function AchievementGrid({ achievements }: AchievementGridProps) {
  if (!achievements || achievements.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Complete lessons and quizzes to earn achievement badges.
      </p>
    );
  }

  return (
    // 2-col on mobile, 4-col on md+ per UI-SPEC Screen 5
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
      {achievements.map((achievement) => (
        <AchievementBadge
          key={achievement.slug}
          slug={achievement.slug}
          name={achievement.name}
          description={achievement.description}
          iconUrl={achievement.iconUrl}
          earnedAt={achievement.earnedAt}
        />
      ))}
    </div>
  );
}
