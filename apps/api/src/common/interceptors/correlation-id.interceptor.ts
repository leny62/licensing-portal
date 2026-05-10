import { randomUUID } from 'node:crypto';

import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { FastifyReply, FastifyRequest } from 'fastify';
import { Observable } from 'rxjs';

export const CORRELATION_ID_HEADER = 'x-correlation-id';

@Injectable()
export class CorrelationIdInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const http = context.switchToHttp();
    const request = http.getRequest<FastifyRequest & { correlationId?: string }>();
    const reply = http.getResponse<FastifyReply>();

    const incomingId =
      typeof request.headers[CORRELATION_ID_HEADER] === 'string'
        ? request.headers[CORRELATION_ID_HEADER]
        : randomUUID();

    request.correlationId = incomingId;
    void reply.header(CORRELATION_ID_HEADER, incomingId);

    return next.handle();
  }
}
