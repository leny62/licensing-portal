import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { HttpMetricInput, MetricsSnapshot } from './interfaces/http-metric.interface';

const buckets = [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10];

interface HttpMetricAggregate {
  count: number;
  sum: number;
  buckets: Map<number, number>;
}

@Injectable()
export class MetricsService {
  private readonly startedAt = new Date();
  private readonly httpMetrics = new Map<string, HttpMetricAggregate>();
  private requestCount = 0;
  private errorCount = 0;

  constructor(private readonly configService: ConfigService) {}

  recordHttpRequest(input: HttpMetricInput): void {
    const route = this.normalizeRoute(input.route);
    const key = this.metricKey(input.method, route, input.statusCode);
    const aggregate = this.httpMetrics.get(key) ?? this.createAggregate();

    aggregate.count += 1;
    aggregate.sum += input.durationSeconds;

    for (const bucket of buckets) {
      if (input.durationSeconds <= bucket) {
        aggregate.buckets.set(bucket, (aggregate.buckets.get(bucket) ?? 0) + 1);
      }
    }

    this.httpMetrics.set(key, aggregate);
    this.requestCount += 1;

    if (input.statusCode >= 500) {
      this.errorCount += 1;
    }
  }

  snapshot(): MetricsSnapshot {
    return {
      startedAt: this.startedAt,
      requestCount: this.requestCount,
      errorCount: this.errorCount,
    };
  }

  render(dbUp: boolean): string {
    const lines = [
      '# HELP licensing_portal_up API process health.',
      '# TYPE licensing_portal_up gauge',
      'licensing_portal_up 1',
      '# HELP licensing_portal_database_up Database connectivity health.',
      '# TYPE licensing_portal_database_up gauge',
      `licensing_portal_database_up ${dbUp ? 1 : 0}`,
      '# HELP licensing_portal_build_info Static application build information.',
      '# TYPE licensing_portal_build_info gauge',
      `licensing_portal_build_info{version="${this.escapeLabel(this.version())}",environment="${this.escapeLabel(
        this.environment(),
      )}"} 1`,
      '# HELP licensing_portal_process_uptime_seconds Node.js process uptime.',
      '# TYPE licensing_portal_process_uptime_seconds gauge',
      `licensing_portal_process_uptime_seconds ${process.uptime().toFixed(3)}`,
      ...this.memoryMetrics(),
      ...this.httpMetricsLines(),
      '',
    ];

    return lines.join('\n');
  }

  private createAggregate(): HttpMetricAggregate {
    return {
      count: 0,
      sum: 0,
      buckets: new Map(buckets.map((bucket) => [bucket, 0])),
    };
  }

  private memoryMetrics(): string[] {
    const memory = process.memoryUsage();
    const metricName = ['licensing_portal', 'process', 'memory', 'bytes'].join('_');

    return [
      '# HELP licensing_portal_process_memory_bytes Node.js process memory usage.',
      '# TYPE licensing_portal_process_memory_bytes gauge',
      `${metricName}{type="rss"} ${memory.rss}`,
      `${metricName}{type="heap_total"} ${memory.heapTotal}`,
      `${metricName}{type="heap_used"} ${memory.heapUsed}`,
      `${metricName}{type="external"} ${memory.external}`,
    ];
  }

  private httpMetricsLines(): string[] {
    const lines = [
      '# HELP licensing_portal_http_requests_total HTTP requests by method, route, and status.',
      '# TYPE licensing_portal_http_requests_total counter',
    ];

    for (const [key, aggregate] of [...this.httpMetrics.entries()].sort()) {
      const labels = this.labelsFromKey(key);
      lines.push(`licensing_portal_http_requests_total{${labels}} ${aggregate.count}`);
    }

    lines.push(
      '# HELP licensing_portal_http_request_duration_seconds HTTP request duration histogram.',
      '# TYPE licensing_portal_http_request_duration_seconds histogram',
    );

    for (const [key, aggregate] of [...this.httpMetrics.entries()].sort()) {
      const labels = this.labelsFromKey(key);

      for (const bucket of buckets) {
        lines.push(
          `licensing_portal_http_request_duration_seconds_bucket{${labels},le="${bucket}"} ${
            aggregate.buckets.get(bucket) ?? 0
          }`,
        );
      }

      lines.push(
        `licensing_portal_http_request_duration_seconds_bucket{${labels},le="+Inf"} ${aggregate.count}`,
        `licensing_portal_http_request_duration_seconds_sum{${labels}} ${aggregate.sum.toFixed(6)}`,
        `licensing_portal_http_request_duration_seconds_count{${labels}} ${aggregate.count}`,
      );
    }

    return lines;
  }

  private metricKey(method: string, route: string, statusCode: number): string {
    return [method.toUpperCase(), route, String(statusCode)]
      .map((part) => this.escapeKey(part))
      .join('|');
  }

  private labelsFromKey(key: string): string {
    const [method, route, status] = key.split('|').map((part) => this.unescapeKey(part));

    return [
      `method="${this.escapeLabel(method ?? '')}"`,
      `route="${this.escapeLabel(route ?? '')}"`,
      `status="${this.escapeLabel(status ?? '')}"`,
    ].join(',');
  }

  private normalizeRoute(route: string): string {
    const pathname = route.split('?')[0] ?? route;

    return pathname
      .replace(/\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}(?=\/|$)/gi, '/:id')
      .replace(/\/APP-[A-Z0-9-]+(?=\/|$)/g, '/:reference');
  }

  private version(): string {
    return process.env.npm_package_version ?? '0.1.0';
  }

  private environment(): string {
    return this.configService.getOrThrow<string>('app.env');
  }

  private escapeLabel(value: string): string {
    return value.replaceAll('\\', '\\\\').replaceAll('\n', '\\n').replaceAll('"', '\\"');
  }

  private escapeKey(value: string): string {
    return encodeURIComponent(value);
  }

  private unescapeKey(value: string): string {
    return decodeURIComponent(value);
  }
}
