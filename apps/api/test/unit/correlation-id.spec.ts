import { ExecutionContext } from '@nestjs/common';
import { of } from 'rxjs';

import {
  CorrelationIdInterceptor,
  CORRELATION_ID_HEADER,
} from '../../src/common/interceptors/correlation-id.interceptor';

const makeContext = (incomingId?: string): ExecutionContext => {
  const headers: Record<string, string> = {};
  if (incomingId !== undefined) {
    headers[CORRELATION_ID_HEADER] = incomingId;
  }

  const request: Record<string, unknown> = { headers, correlationId: undefined };
  const replyHeaders: Record<string, string> = {};
  const reply = {
    header: (key: string, value: string) => {
      replyHeaders[key] = value;
      return reply;
    },
    replyHeaders,
  };

  return {
    switchToHttp: () => ({
      getRequest: () => request,
      getResponse: () => reply,
    }),
  } as unknown as ExecutionContext;
};

describe('CorrelationIdInterceptor', () => {
  let interceptor: CorrelationIdInterceptor;

  beforeEach(() => {
    interceptor = new CorrelationIdInterceptor();
  });

  it('generates a UUID when no correlation-id header is present', (done) => {
    const ctx = makeContext();
    const req = ctx.switchToHttp().getRequest<{ correlationId?: string }>();

    interceptor.intercept(ctx, { handle: () => of(null) }).subscribe(() => {
      expect(req.correlationId).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
      );
      done();
    });
  });

  it('propagates the incoming correlation-id header to the request', (done) => {
    const id = 'incoming-id-abc';
    const ctx = makeContext(id);
    const req = ctx.switchToHttp().getRequest<{ correlationId?: string }>();

    interceptor.intercept(ctx, { handle: () => of(null) }).subscribe(() => {
      expect(req.correlationId).toBe(id);
      done();
    });
  });

  it('echoes the correlation-id back in the response header', (done) => {
    const id = 'my-trace-id';
    const ctx = makeContext(id);
    const reply = ctx.switchToHttp().getResponse<{ replyHeaders: Record<string, string> }>();

    interceptor.intercept(ctx, { handle: () => of(null) }).subscribe(() => {
      expect(reply.replyHeaders[CORRELATION_ID_HEADER]).toBe(id);
      done();
    });
  });

  it('sets a consistent ID on both request and response', (done) => {
    const ctx = makeContext();
    const req = ctx.switchToHttp().getRequest<{ correlationId?: string }>();
    const reply = ctx.switchToHttp().getResponse<{ replyHeaders: Record<string, string> }>();

    interceptor.intercept(ctx, { handle: () => of(null) }).subscribe(() => {
      expect(req.correlationId).toBe(reply.replyHeaders[CORRELATION_ID_HEADER]);
      done();
    });
  });
});
