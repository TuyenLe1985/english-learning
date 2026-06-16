import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from '../prisma/prisma.module';
import { ClassifierService } from './classifier.service';
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
    ListeningCrawlerService,
    ListeningSeedService,
  ],
  exports: [
    ClassifierService,
    ListeningCrawlerService,
    ListeningSeedService,
  ],
})
export class PipelineModule {}
