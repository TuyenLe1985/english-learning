import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);

  // Set global API prefix — ALL routes will be under /api/ prefix.
  // CRITICAL: This must never change post-launch — all client URLs depend on it.
  app.setGlobalPrefix('api');

  // Apply ValidationPipe globally:
  // - whitelist: true strips unknown DTO properties (prevents property injection attacks)
  // - transform: true auto-transforms plain objects to DTO class instances
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
    }),
  );

  app.enableShutdownHooks();

  const port = process.env['PORT'] ?? 3001;
  await app.listen(port);
}

bootstrap();
