/**
 * Pipeline CLI — standalone NestJS application context.
 *
 * Uses NestFactory.createApplicationContext (NOT NestFactory.create).
 * No HTTP server is bootstrapped. Full DI is available.
 *
 * Usage (via pnpm scripts in apps/api/package.json):
 *   pnpm pipeline:validate  — validate selectors against 50-URL sample (MANDATORY before bulk crawl)
 *   pnpm pipeline:crawl     — bulk crawl all 4 sources, write crawled-passages.json
 *   pnpm pipeline:seed      — classify + seed from crawled-passages.json
 *   pnpm pipeline:run       — crawl + seed in one step
 *
 * Exit 0 on success, exit 1 on error.
 */

import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { PipelineModule } from './pipeline.module';
import { CrawlerService } from './crawler.service';
import { SeedService } from './seed.service';

const DEFAULT_CRAWLED_FILE = './crawled-passages.json';

async function bootstrap(): Promise<void> {
  const flag = process.argv.find((arg) =>
    ['--validate', '--crawl', '--seed', '--run'].includes(arg),
  );

  if (!flag) {
    console.error(
      'Usage: pipeline.cli.ts -- --validate | --crawl | --seed | --run',
    );
    process.exit(1);
  }

  const app = await NestFactory.createApplicationContext(PipelineModule, {
    logger: ['log', 'warn', 'error'],
  });

  try {
    const crawler = app.get(CrawlerService);
    const seeder = app.get(SeedService);

    switch (flag) {
      case '--validate': {
        console.log('Running selector validation (50-URL sample per source)…');
        const results = await crawler.validateSelectors();
        const anyFailed = results.some((r) => r.successRate < 0.8);
        if (anyFailed) {
          console.warn(
            '\nWARNING: One or more sources have successRate < 80%. Inspect selectors before bulk crawl.',
          );
        } else {
          console.log('\nAll sources passed validation (≥80%). Safe to proceed with crawl.');
        }
        break;
      }

      case '--crawl': {
        console.log('Starting bulk crawl of all 4 sources…');
        const passages = await crawler.crawlAll();
        console.log(`\nCrawl complete: ${passages.length} passages written to ${DEFAULT_CRAWLED_FILE}`);
        break;
      }

      case '--seed': {
        console.log(`Seeding from ${DEFAULT_CRAWLED_FILE}…`);
        await seeder.seedFromFile(DEFAULT_CRAWLED_FILE);
        console.log('\nSeeding complete.');
        break;
      }

      case '--run': {
        console.log('Running full pipeline: crawl → classify → seed (streaming, every 50 articles)…');
        let totalSeeded = 0;
        const passages = await crawler.crawlAll(async (batch) => {
          await seeder.seedPassages(batch);
          totalSeeded += batch.length;
          console.log(`Streamed ${totalSeeded} articles seeded so far — visible at /reading now`);
        });
        console.log(`\nFull pipeline complete. ${passages.length} articles crawled, ${totalSeeded} seeded.`);
        break;
      }

      default: {
        console.error(`Unknown flag: ${flag}`);
        process.exit(1);
      }
    }
  } catch (err) {
    console.error('Pipeline error:', err);
    await app.close();
    process.exit(1);
  }

  await app.close();
  process.exit(0);
}

bootstrap().catch((err: unknown) => {
  console.error('Fatal pipeline error:', err);
  process.exit(1);
});
