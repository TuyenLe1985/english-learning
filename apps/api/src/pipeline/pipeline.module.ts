import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from '../prisma/prisma.module';
import { ClassifierService } from './classifier.service';
import { CrawlerService } from './crawler.service';
import { SeedService } from './seed.service';
import { ListeningCrawlerService } from './listening-crawler.service';
import { ListeningSeedService } from './listening-seed.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['../../.env', '.env'],
    }),
    PrismaModule,
  ],
  providers: [
    ClassifierService,
    CrawlerService,
    SeedService,
    ListeningCrawlerService,
    ListeningSeedService,
  ],
  exports: [
    ClassifierService,
    CrawlerService,
    SeedService,
    ListeningCrawlerService,
    ListeningSeedService,
  ],
})
export class PipelineModule {}
