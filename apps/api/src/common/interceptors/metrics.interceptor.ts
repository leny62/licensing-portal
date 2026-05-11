import {
  CallHandler,
  ExecutionContext,
  HttpException,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { FastifyReply, FastifyRequest } from 'fastify';
import { Observable, catchError, tap, throwError } from 'rxjs';

import { MetricsService } from '../observability/metrics.service';

@Injectable()
export class MetricsInterceptor implements NestInterceptor {
  constructor(private readonly metricsService: MetricsService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const startedAt = process.hrtime.bigint();
    const http = context.switchToHttp();
    const request = http.getRequest<FastifyRequest>();
    const reply = http.getResponse<FastifyReply>();

    if (this.shouldSkip(request.url)) {
      return next.handle();
    }

    return next.handle().pipe(
      tap(() => {
        this.record(request, reply.statusCode, startedAt);
      }),
      catchError((error: unknown) => {
        const statusCode = error instanceof HttpException ? error.getStatus() : 500;
        this.record(request, statusCode, startedAt);

        return throwError(() => error);
      }),
    );
  }

  private record(request: FastifyRequest, statusCode: number, startedAt: bigint): void {
    this.metricsService.recordHttpRequest({
      method: request.method,
      route: request.url,
      statusCode,
      durationSeconds: Number(process.hrtime.bigint() - startedAt) / 1_000_000_000,
    });
  }

  private shouldSkip(url: string): boolean {
    const path = url.split('?')[0] ?? url;

    return path.endsWith('/metrics');
  }
}
