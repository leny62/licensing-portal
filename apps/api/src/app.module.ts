import { Module } from '@nestjs/common';
import { APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerModule } from '@nestjs/throttler';
import { LoggerModule } from 'nestjs-pino';

import { configuration } from './config/configuration';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { CorrelationIdInterceptor } from './common/interceptors/correlation-id.interceptor';
import { MetricsInterceptor } from './common/interceptors/metrics.interceptor';
import { SystemLogInterceptor } from './common/interceptors/system-log.interceptor';
import { ObservabilityModule } from './common/observability/observability.module';
import { AuditModule } from './infra/audit/audit.module';
import { KeysModule } from './infra/keys/keys.module';
import { PrismaModule } from './infra/prisma/prisma.module';
import { StorageModule } from './infra/storage/storage.module';
import { ApplicationsModule } from './modules/applications/applications.module';
import { AuditApiModule } from './modules/audit/audit.module';
import { AuthModule } from './modules/auth/auth.module';
import { DocumentsModule } from './modules/documents/documents.module';
import { HealthModule } from './modules/health/health.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { SystemLogsModule } from './modules/system-logs/system-logs.module';
import { UsersModule } from './modules/users/users.module';

const redactedLogPaths = [
  'req.headers.authorization',
  'req.headers.cookie',
  'res.headers["set-cookie"]',
  'password',
  'passwordHash',
  'token',
  'accessToken',
  'refreshToken',
  'privateKey',
  'publicKey',
  'kekMaterial',
  'dekPlaintext',
  '*.password',
  '*.passwordHash',
  '*.token',
  '*.accessToken',
  '*.refreshToken',
  '*.privateKey',
  '*.publicKey',
];

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      cache: true,
    }),
    LoggerModule.forRoot({
      pinoHttp: {
        level: process.env.LOG_LEVEL ?? 'info',
        redact: {
          paths: redactedLogPaths,
          censor: '[REDACTED]',
        },
      },
    }),
    ScheduleModule.forRoot(),
    ThrottlerModule.forRoot([
      {
        ttl: Number(process.env.RATE_LIMIT_TTL_SECONDS ?? 60) * 1000,
        limit: Number(process.env.RATE_LIMIT_LIMIT ?? 100),
      },
    ]),
    KeysModule,
    ObservabilityModule,
    StorageModule,
    AuditModule,
    PrismaModule,
    AuthModule,
    UsersModule,
    ApplicationsModule,
    DocumentsModule,
    AuditApiModule,
    NotificationsModule,
    SystemLogsModule,
    HealthModule,
  ],
  providers: [
    {
      provide: APP_FILTER,
      useClass: AllExceptionsFilter,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: CorrelationIdInterceptor,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: MetricsInterceptor,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: SystemLogInterceptor,
    },
  ],
})
export class AppModule {}
