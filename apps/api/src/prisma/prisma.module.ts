/**
 * PrismaModule — provides and exports PrismaService as a NestJS global module.
 *
 * Marked @Global() so any feature module can inject PrismaService without
 * explicitly importing PrismaModule — mirrors ConfigModule's global pattern.
 */

import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';

@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
