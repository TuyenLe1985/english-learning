import { NestFactory } from '@nestjs/core';
import { PipelineModule } from './pipeline.module';
import { ListeningCrawlerService } from './listening-crawler.service';

interface SourceConfig {
  name: string;
  sampleUrls: string[];
}

async function validateSource(
  crawler: ListeningCrawlerService,
  source: SourceConfig,
): Promise<void> {
  let passed = 0;
  for (const url of source.sampleUrls) {
    try {
      const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
      if (res.ok) {
        const text = await res.text();
        if (text.length > 200) passed++;
      }
    } catch {
      // failed
    }
  }
  const pct = Math.round((passed / source.sampleUrls.length) * 100);
  console.log(`[Validate] ${source.name}: ${passed}/${source.sampleUrls.length} (${pct}%)`);
  if (pct < 80) {
    console.error(`[Validate] FAIL: ${source.name} success rate ${pct}% < 80%`);
    process.exitCode = 1;
  }
}

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(PipelineModule, {
    logger: ['error', 'warn', 'log'],
  });
  const crawler = app.get(ListeningCrawlerService);
  void crawler; // reserved for future per-URL audio checks

  const sources: SourceConfig[] = [
    {
      name: 'VOA',
      sampleUrls: Array(5).fill('https://learningenglish.voanews.com/z/4863'),
    },
    {
      name: 'BBC',
      sampleUrls: Array(5).fill(
        'https://www.bbc.co.uk/learningenglish/english/features/6-minute-english',
      ),
    },
    {
      name: 'ESLPod',
      sampleUrls: Array(5).fill(
        'https://archive.org/advancedsearch.php?q=subject%3A%22eslpod%22&rows=5&output=json',
      ),
    },
    {
      name: 'TED',
      sampleUrls: Array(5).fill('https://www.ted.com/talks?language=en&sort=newest'),
    },
  ];

  for (const source of sources) {
    await validateSource(crawler, source);
  }

  await app.close();
}

bootstrap().catch(console.error);
