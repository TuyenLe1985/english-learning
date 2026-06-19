import { NestFactory } from '@nestjs/core';
import { PipelineModule } from './pipeline.module';
import { ListeningCrawlerService } from './listening-crawler.service';
import { ListeningSeedService } from './listening-seed.service';
import { PrismaService } from '../prisma/prisma.service';

const SAMPLE_ITEMS = [
  {
    sourceUrl: 'https://archive.org/details/ESLPod0372/ESLPod0364.mp3',
    audioUrl: 'https://archive.org/download/ESLPod0372/ESLPod0364.mp3',
    title: 'ESLPod 364 – A Healthy Lifestyle',
    contentType: 'PODCAST' as const,
    transcriptText: `Today we are talking about healthy lifestyle choices and how they affect our daily lives. 
      Eating well is one of the most important things you can do for your health. 
      A balanced diet includes plenty of vegetables, fruits, whole grains, and lean proteins. 
      Exercise is also essential for maintaining good health. Even thirty minutes of walking each day 
      can make a significant difference in how you feel. Sleep is another critical factor. 
      Most adults need between seven and nine hours of sleep per night to function at their best. 
      Managing stress through activities like meditation, yoga, or simply spending time with friends 
      can also improve your overall wellbeing. When we combine good nutrition, regular exercise, 
      adequate sleep, and effective stress management, we create the foundation for a long and healthy life.`,
  },
  {
    sourceUrl: 'https://archive.org/details/ESLPod0372/ESLPod0366.mp3',
    audioUrl: 'https://archive.org/download/ESLPod0372/ESLPod0366.mp3',
    title: 'ESLPod 366 – At the Office',
    contentType: 'CONVERSATION' as const,
    transcriptText: `Good morning everyone, welcome to our weekly team meeting. 
      Today we have several important items on the agenda. First, we will discuss the progress 
      of the current project and review the timeline. As you can see from the report, 
      we are slightly behind schedule due to some unexpected technical challenges. 
      However, the team has been working hard to address these issues. 
      We need to prioritize the remaining tasks and ensure that everyone understands their responsibilities. 
      Communication is key in any workplace environment. When team members share information openly 
      and collaborate effectively, projects tend to run much more smoothly. 
      Let us also take a moment to recognize the outstanding contributions of our colleagues 
      who went above and beyond their normal duties this week. Your hard work is greatly appreciated.`,
  },
];

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(PipelineModule, { logger: ['error', 'warn', 'log'] });
  const crawler = app.get(ListeningCrawlerService);
  const seeder = app.get(ListeningSeedService);
  const prisma = app.get(PrismaService);

  for (const item of SAMPLE_ITEMS) {
    console.log(`[seed-real-audio] Processing: ${item.title}`);
    await crawler.crawlItem(item.sourceUrl, item.contentType, item.title, item.audioUrl, item.transcriptText);
  }

  // Mark them published and generate exercises
  await prisma.listeningContent.updateMany({
    where: { sourceUrl: { in: SAMPLE_ITEMS.map(i => i.sourceUrl) } },
    data: { isPublished: true },
  });

  console.log('[seed-real-audio] Generating exercises...');
  await seeder.run();
  console.log('[seed-real-audio] Done. Check /listening for new items.');
  await app.close();
}

bootstrap().catch(console.error);
