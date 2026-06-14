/**
 * PipelineModule — NestJS module for the standalone content pipeline CLI.
 *
 * This module is NOT imported by AppModule — it is used exclusively by the
 * standalone pipeline CLI (pipeline.cli.ts) via NestFactory.createApplicationContext.
 *
 * PrismaModule must be imported explicitly here because PipelineModule is not
 * part of AppModule, so the global PrismaModule registration does not apply.
 *
 * Exports ClassifierService so the standalone CLI context can retrieve it.
 * Additional pipeline services (CrawlerService, SeedService) will be added in 05-05.
 */

import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { ClassifierService } from './classifier.service';

@Module({
  imports: [PrismaModule],
  providers: [ClassifierService],
  exports: [ClassifierService],
})
export class PipelineModule {}
