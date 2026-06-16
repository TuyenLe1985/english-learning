import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { HealthModule } from './health/health.module';
import { AuthModule } from './auth/auth.module';
import { PrismaModule } from './prisma/prisma.module';
import { UsersModule } from './users/users.module';
import { ProfileModule } from './profile/profile.module';
import { VocabularyModule } from './vocabulary/vocabulary.module';
import { SrsModule } from './srs/srs.module';
import { GrammarModule } from './grammar/grammar.module';
import { ListeningModule } from './listening/listening.module';
import { ReadingModule } from './reading/reading.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['../../.env', '.env'],
    }),
    PrismaModule,
    HealthModule,
    AuthModule,
    UsersModule,
    ProfileModule,
    VocabularyModule,
    SrsModule,
    GrammarModule,
    ListeningModule,
    ReadingModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
