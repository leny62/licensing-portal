import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { FastifyReply, FastifyRequest } from 'fastify';

import { buildErrorResponse } from '../dto/error-response.dto';
import { DomainError } from '../errors/domain.errors';
import { CORRELATION_ID_HEADER } from '../interceptors/correlation-id.interceptor';

interface ValidationErrorBody {
  message: string | string[];
  statusCode: number;
  error?: string;
}

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const request = ctx.getRequest<FastifyRequest & { correlationId?: string }>();
    const reply = ctx.getResponse<FastifyReply>();

    const correlationId =
      request.correlationId ??
      (typeof request.headers[CORRELATION_ID_HEADER] === 'string'
        ? request.headers[CORRELATION_ID_HEADER]
        : 'unknown');

    if (exception instanceof DomainError) {
      this.logger.error(
        {
          correlationId,
          code: exception.code,
          message: exception.message,
          details: exception.details,
        },
        'Domain error',
      );

      void reply
        .status(exception.httpStatus)
        .send(
          buildErrorResponse(exception.code, exception.message, correlationId, exception.details),
        );
      return;
    }

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const body = exception.getResponse();

      const { code, message } = this.resolveHttpException(status, body);

      this.logger.warn({ correlationId, code, status, message }, 'HTTP exception');

      void reply.status(status).send(buildErrorResponse(code, message, correlationId));
      return;
    }

    const message =
      exception instanceof Error ? exception.message : 'An unexpected error occurred.';

    this.logger.error(
      {
        correlationId,
        err:
          exception instanceof Error
            ? { message: exception.message, stack: exception.stack }
            : exception,
      },
      'Unhandled exception',
    );

    void reply
      .status(HttpStatus.INTERNAL_SERVER_ERROR)
      .send(buildErrorResponse('INTERNAL_ERROR', 'An unexpected error occurred.', correlationId));

    void message;
  }

  private resolveHttpException(
    status: number,
    body: string | object,
  ): { code: string; message: string } {
    if (status === HttpStatus.BAD_REQUEST && typeof body === 'object' && body !== null) {
      const typed = body as ValidationErrorBody;
      const messages = Array.isArray(typed.message)
        ? typed.message.join('; ')
        : (typed.message ?? 'Validation failed.');
      return { code: 'VALIDATION_ERROR', message: messages };
    }

    if (status === HttpStatus.UNAUTHORIZED) {
      return { code: 'UNAUTHORIZED', message: 'Authentication required.' };
    }

    if (status === HttpStatus.FORBIDDEN) {
      return { code: 'FORBIDDEN', message: 'Access denied.' };
    }

    if (status === HttpStatus.NOT_FOUND) {
      return { code: 'NOT_FOUND', message: 'Resource not found.' };
    }

    if (status === HttpStatus.CONFLICT) {
      return { code: 'CONFLICT', message: 'Resource conflict.' };
    }

    if (status === HttpStatus.UNPROCESSABLE_ENTITY) {
      return {
        code: 'VALIDATION_ERROR',
        message: typeof body === 'string' ? body : 'Unprocessable entity.',
      };
    }

    const message =
      typeof body === 'string'
        ? body
        : typeof body === 'object' &&
            'message' in body &&
            typeof (body as { message: unknown }).message === 'string'
          ? (body as { message: string }).message
          : 'Request failed.';

    return {
      code: `HTTP_${status}`,
      message,
    };
  }
}
