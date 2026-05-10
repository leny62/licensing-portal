import {
  CallHandler,
  ExecutionContext,
  HttpException,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import { SystemLogLevel } from '@prisma/client';
import { FastifyReply, FastifyRequest } from 'fastify';
import { hostname } from 'os';
import { Observable, catchError, tap, throwError } from 'rxjs';

import { SystemLogsService } from '../../modules/system-logs/system-logs.service';
import { AuthenticatedUser } from '../../modules/auth/interfaces/authenticated-user.interface';
import { CORRELATION_ID_HEADER } from './correlation-id.interceptor';

@Injectable()
export class SystemLogInterceptor implements NestInterceptor {
  private readonly logger = new Logger(SystemLogInterceptor.name);
  private readonly serverName = hostname();

  constructor(private readonly systemLogsService: SystemLogsService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const http = context.switchToHttp();
    const request = http.getRequest<
      FastifyRequest & { correlationId?: string; user?: AuthenticatedUser }
    >();
    const reply = http.getResponse<FastifyReply>();
    const loggerName = `${context.getClass().name}.${context.getHandler().name}`;

    if (this.shouldSkip(request.url)) {
      return next.handle();
    }

    return next.handle().pipe(
      tap(() => {
        const statusCode = reply.statusCode;
        void this.write(request, {
          level: statusCode >= 400 ? SystemLogLevel.WARN : SystemLogLevel.INFO,
          loggerName,
          message: `${request.method} ${request.url} completed with status ${statusCode}`,
          code: String(statusCode),
        });
      }),
      catchError((error: unknown) => {
        const statusCode = error instanceof HttpException ? error.getStatus() : 500;
        void this.write(request, {
          level: statusCode >= 500 ? SystemLogLevel.ERROR : SystemLogLevel.WARN,
          loggerName,
          message: `${request.method} ${request.url} failed with status ${statusCode}`,
          code: String(statusCode),
          exception: error instanceof Error ? error.message : 'Request failed.',
        });

        return throwError(() => error);
      }),
    );
  }

  private async write(
    request: FastifyRequest & { correlationId?: string; user?: AuthenticatedUser },
    event: {
      level: SystemLogLevel;
      loggerName: string;
      message: string;
      code: string;
      exception?: string;
    },
  ): Promise<void> {
    try {
      await this.systemLogsService.write({
        userId: request.user?.id ?? null,
        userName: request.user?.email ?? null,
        level: event.level,
        method: request.method,
        url: request.url,
        message: event.message,
        requestId: this.requestId(request),
        exception: event.exception ?? null,
        logger: event.loggerName,
        hostAddress: request.ip,
        browser: this.headerValue(request.headers['user-agent']),
        serverName: this.serverName,
        code: event.code,
        deviceId: this.headerValue(request.headers['x-device-id']),
        thread: String(process.pid),
        businessLayer: event.loggerName.split('.')[0] ?? null,
      });
    } catch (error) {
      this.logger.warn(
        {
          err: error instanceof Error ? { message: error.message } : error,
          requestId: this.requestId(request),
        },
        'System log write failed',
      );
    }
  }

  private requestId(request: FastifyRequest & { correlationId?: string }): string | null {
    return (
      request.correlationId ?? this.headerValue(request.headers[CORRELATION_ID_HEADER]) ?? null
    );
  }

  private headerValue(value: string | string[] | undefined): string | null {
    if (Array.isArray(value)) {
      return value.join(', ');
    }

    return value ?? null;
  }

  private shouldSkip(url: string): boolean {
    return url === '/healthz' || url === '/metrics';
  }
}
