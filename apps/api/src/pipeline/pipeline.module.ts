/**
 * PipelineModule — NestJS module for the standalone content pipeline CLI.
 *
 * This module is NOT imported by AppModule — it is used exclusively by the
 * standalone pipeline CLI (pipeline.cli.ts) via NestFactory.createApplicationContext.
 *
 * PrismaModule must be imported explicitly here because PipelineModule is not
 * part of AppModule, so the global PrismaModule registration does not apply.
 *
 * Exports all pipeline services so the standalone CLI context can retrieve them.
 */

import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { ClassifierService } from './classifier.service';
import { CrawlerService } from './crawler.service';
import { SeedService } from './seed.service';

@Module({
  imports: [PrismaModule],
  providers: [ClassifierService, CrawlerService, SeedService],
  exports: [ClassifierService, CrawlerService, SeedService],
})
export class PipelineModule {}
