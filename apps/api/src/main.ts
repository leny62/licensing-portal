import 'reflect-metadata';

import helmet from '@fastify/helmet';
import multipart from '@fastify/multipart';
import { Logger as NestLogger, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { Logger } from 'nestjs-pino';

import { AppModule } from './app.module';

const parseCorsOrigin = (origin: string): boolean | string[] => {
  if (origin === '*') {
    return true;
  }

  return origin.split(',').map((entry) => entry.trim());
};

const bootstrap = async (): Promise<void> => {
  const app = await NestFactory.create<NestFastifyApplication>(AppModule, new FastifyAdapter(), {
    bufferLogs: true,
  });
  const configService = app.get(ConfigService);

  app.useLogger(app.get(Logger));
  app.enableShutdownHooks();
  app.setGlobalPrefix('api/v1');
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  await app.register(helmet);
  await app.register(multipart, {
    limits: {
      fileSize: configService.getOrThrow<number>('documents.maxBytes'),
    },
  });

  app.enableCors({
    origin: parseCorsOrigin(configService.getOrThrow<string>('security.corsOrigins')),
    credentials: true,
  });

  const appEnv = configService.getOrThrow<string>('app.env');
  const swaggerEnabled = configService.getOrThrow<boolean>('security.swaggerEnabled');

  if (appEnv !== 'production' && swaggerEnabled) {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('Licensing Portal API')
      .setDescription('Bank licensing and compliance portal backend API')
      .setVersion('0.1.0')
      .addBearerAuth()
      .build();
    const document = SwaggerModule.createDocument(app, swaggerConfig);

    SwaggerModule.setup('api/docs', app, document);
  }

  await app.listen(
    configService.getOrThrow<number>('app.port'),
    configService.getOrThrow<string>('app.host'),
  );
};

const bootstrapLogger = new NestLogger('Bootstrap');

bootstrap().catch((error: unknown) => {
  bootstrapLogger.error(error instanceof Error ? error.stack : String(error));
  process.exit(1);
});
