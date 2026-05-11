import { timingSafeEqual } from 'node:crypto';

import { Controller, Get, Header, Headers, Res, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { FastifyReply } from 'fastify';

import { HealthResponse } from './interfaces/health-response.interface';
import { HealthService } from './health.service';

@Controller()
export class HealthController {
  constructor(
    private readonly healthService: HealthService,
    private readonly configService: ConfigService,
  ) {}

  @Get('healthz')
  async healthz(@Res({ passthrough: true }) reply: FastifyReply): Promise<HealthResponse> {
    return this.withStatus(await this.healthService.healthz(), reply);
  }

  @Get('livez')
  livez(): HealthResponse {
    return this.healthService.livez();
  }

  @Get('readyz')
  async readyz(@Res({ passthrough: true }) reply: FastifyReply): Promise<HealthResponse> {
    return this.withStatus(await this.healthService.readyz(), reply);
  }

  @Get('metrics')
  @Header('content-type', 'text/plain; version=0.0.4; charset=utf-8')
  async metrics(@Headers('authorization') authorization?: string): Promise<string> {
    this.assertMetricsAccess(authorization);

    return this.healthService.metrics();
  }

  private withStatus(response: HealthResponse, reply: FastifyReply): HealthResponse {
    if (response.status === 'error') {
      reply.status(503);
    }

    return response;
  }

  private assertMetricsAccess(authorization: string | undefined): void {
    const expectedToken = this.configService.get<string>('security.metricsBearerToken');

    if (expectedToken === undefined || expectedToken === '') {
      return;
    }

    const token = authorization?.startsWith('Bearer ')
      ? authorization.slice('Bearer '.length)
      : undefined;

    if (token === undefined || !this.sameToken(token, expectedToken)) {
      throw new UnauthorizedException('Metrics bearer token required.');
    }
  }

  private sameToken(actual: string, expected: string): boolean {
    const actualBuffer = Buffer.from(actual);
    const expectedBuffer = Buffer.from(expected);

    return (
      actualBuffer.byteLength === expectedBuffer.byteLength &&
      timingSafeEqual(actualBuffer, expectedBuffer)
    );
  }
}
