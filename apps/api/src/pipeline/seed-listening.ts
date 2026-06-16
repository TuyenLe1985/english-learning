import { NestFactory } from '@nestjs/core';
import { PipelineModule } from './pipeline.module';
import { ListeningSeedService } from './listening-seed.service';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(PipelineModule, {
    logger: ['error', 'warn', 'log'],
  });
  const seeder = app.get(ListeningSeedService);

  console.log('[seed-listening] Starting exercise generation...');
  await seeder.run();
  console.log('[seed-listening] Seeding complete.');

  await app.close();
}

bootstrap().catch(console.error);
