/**
 * pipeline.cli.ts — NestJS standalone application context CLI bootstrap
 *
 * Runs the content pipeline as a standalone NestJS app (no HTTP server).
 * Uses NestFactory.createApplicationContext for full DI, PrismaService, ConfigModule.
 *
 * Usage (from apps/api directory, via pnpm scripts):
 *   pnpm pipeline:validate  → CrawlerService.validateSelectors() (50-URL sample per source)
 *   pnpm pipeline:crawl     → CrawlerService.crawlAll() (bulk crawl, writes crawled-passages.json)
 *   pnpm pipeline:seed      → SeedService.seedFromFile('./crawled-passages.json')
 *   pnpm pipeline:run       → crawlAll() then seedFromFile() (full pipeline)
 *
 * Decision D-09: Standalone pnpm script (not BullMQ) — runs offline, deterministic.
 * Pattern 3 from 05-PATTERNS.md: NestFactory.createApplicationContext
 */

import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { PipelineModule } from './pipeline.module';
import { CrawlerService } from './crawler.service';
import { SeedService } from './seed.service';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.createApplicationContext(PipelineModule, {
    logger: ['error', 'warn', 'log'],
  });

  const crawler = app.get(CrawlerService);
  const seeder = app.get(SeedService);

  // Parse CLI flag from argv (ts-node invocation: -- --flag shifts position)
  // Support both: node pipeline.cli.ts --validate AND node pipeline.cli.ts -- --validate
  const args = process.argv.slice(2);
  const flag = args.find((a) => a.startsWith('--')) ?? '';

  try {
    switch (flag) {
      case '--validate':
        console.log('[Pipeline] Running selector validation (50-URL sample per source)...');
        await crawler.validateSelectors();
        console.log('[Pipeline] Validation complete.');
        break;

      case '--crawl':
        console.log('[Pipeline] Starting bulk crawl (≥625 URLs per source)...');
        await crawler.crawlAll();
        console.log('[Pipeline] Crawl complete. Run pipeline:seed to seed the database.');
        break;

      case '--seed':
        console.log('[Pipeline] Starting seed from crawled-passages.json...');
        await seeder.seedFromFile('./crawled-passages.json');
        console.log('[Pipeline] Seed complete.');
        break;

      case '--run':
        console.log('[Pipeline] Running full pipeline (crawl + seed)...');
        await crawler.crawlAll();
        await seeder.seedFromFile('./crawled-passages.json');
        console.log('[Pipeline] Full pipeline complete.');
        break;

      default:
        console.error(
          '[Pipeline] Unknown flag: ' + (flag || '(none)') + '\n' +
          'Usage: pipeline.cli.ts -- [--validate | --crawl | --seed | --run]\n' +
          '  --validate  Test selectors on 50-URL sample per source (MANDATORY before bulk crawl)\n' +
          '  --crawl     Run bulk crawl (≥625 URLs per source) → crawled-passages.json\n' +
          '  --seed      Seed DB from crawled-passages.json\n' +
          '  --run       crawl + seed (full pipeline)',
        );
        await app.close();
        process.exit(1);
    }
  } catch (err) {
    console.error('[Pipeline] Fatal error:', err);
    await app.close();
    process.exit(1);
  }

  await app.close();
  process.exit(0);
}

bootstrap().catch((err: unknown) => {
  console.error('[Pipeline] Unhandled error during bootstrap:', err);
  process.exit(1);
});
