import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../infra/prisma/prisma.service';
import { HealthResponse } from './interfaces/health-response.interface';

@Injectable()
export class HealthService {
  constructor(private readonly prisma: PrismaService) {}

  async healthz(): Promise<HealthResponse> {
    await this.prisma.$queryRaw`SELECT 1`;

    return { status: 'ok', db: 'ok' };
  }

  metrics(): string {
    return [
      '# HELP licensing_portal_up API process health.',
      '# TYPE licensing_portal_up gauge',
      'licensing_portal_up 1',
      '',
    ].join('\n');
  }
}
