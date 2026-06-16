import { NestFactory } from '@nestjs/core';
import { PipelineModule } from './pipeline.module';
import { ListeningCrawlerService } from './listening-crawler.service';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(PipelineModule, {
    logger: ['error', 'warn', 'log'],
  });
  const crawler = app.get(ListeningCrawlerService);

  console.log('[crawl-listening] Starting full crawl across all 4 sources...');
  await crawler.crawlVoa(75);
  await crawler.crawlBbc(75);
  await crawler.crawlEslpod(75);
  await crawler.crawlLecture(75);
  console.log('[crawl-listening] Crawl complete.');

  await app.close();
}

bootstrap().catch(console.error);
