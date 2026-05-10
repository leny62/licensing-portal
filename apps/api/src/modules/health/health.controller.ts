import { Controller, Get, Header } from '@nestjs/common';

import { HealthResponse } from './interfaces/health-response.interface';
import { HealthService } from './health.service';

@Controller()
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get('healthz')
  async healthz(): Promise<HealthResponse> {
    return this.healthService.healthz();
  }

  @Get('metrics')
  @Header('content-type', 'text/plain; version=0.0.4; charset=utf-8')
  metrics(): string {
    return this.healthService.metrics();
  }
}
