/**
 * PrismaService — NestJS-injectable PrismaClient wrapper.
 *
 * Extends PrismaClient so all model accessors (user, account, etc.) are
 * available directly via the service instance. This is the canonical NestJS
 * + Prisma pattern: https://www.prisma.io/docs/guides/nestjs
 *
 * For testing: inject a mock object with the same shape as PrismaClient
 * using { provide: PrismaService, useValue: mockPrisma }.
 */

import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@repo/database';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  constructor() {
    super({ log: ['error'] });
  }

  async onModuleInit(): Promise<void> {
    await this.$connect();
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }
}
