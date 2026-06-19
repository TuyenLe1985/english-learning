import { NestFactory } from '@nestjs/core';
import { PipelineModule } from './pipeline.module';
import { ListeningCrawlerService } from './listening-crawler.service';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(PipelineModule, { logger: ['error', 'warn', 'log'] });
  const crawler = app.get(ListeningCrawlerService);
  console.log('[sample-crawl] Crawling ESLPod — 20 items...');
  await crawler.crawlEslpod(20);
  console.log('[sample-crawl] Done.');
  await app.close();
}

bootstrap().catch(console.error);
