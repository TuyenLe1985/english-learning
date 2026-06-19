/**
 * GamificationService stub — full implementation in Plan 07-02.
 *
 * This stub exists so GamificationModule + spec files compile.
 * All methods throw 'not implemented' — tests should FAIL (RED state).
 */

import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import type { AchievementDto } from "@repo/shared";
import type { SkillArea } from "@prisma/client";

@Injectable()
export class GamificationService {
  constructor(private readonly prisma: PrismaService) {}

  async awardXp(
    _userId: string,
    _amount: number,
    _reason: string,
    _skillArea: SkillArea,
    _sourceRef?: string,
  ): Promise<{
    xpEarned: number;
    oldLevel: number;
    newLevel: number;
    levelUp: boolean;
  }> {
    throw new Error("not implemented");
  }

  async checkAchievements(
    _userId: string,
    _event: { type: string; metadata?: Record<string, unknown> },
  ): Promise<AchievementDto[]> {
    throw new Error("not implemented");
  }

  async seedAchievements(): Promise<void> {
    throw new Error("not implemented");
  }
}
