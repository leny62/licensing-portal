import { MetricsService } from '../../src/common/observability/metrics.service';

describe('MetricsService', () => {
  const configService = {
    getOrThrow: jest.fn(() => 'test'),
  };

  it('records request counters and duration buckets with normalized routes', () => {
    const service = new MetricsService(configService as never);

    service.recordHttpRequest({
      method: 'GET',
      route: '/api/v1/applications/9d0e3e0c-27a3-41a1-8625-e26f276bb68e/audit?page=0',
      statusCode: 200,
      durationSeconds: 0.02,
    });

    const output = service.render(true);

    expect(output).toContain('licensing_portal_up 1');
    expect(output).toContain('licensing_portal_database_up 1');
    expect(output).toContain(
      'licensing_portal_http_requests_total{method="GET",route="/api/v1/applications/:id/audit",status="200"} 1',
    );
    expect(output).toContain(
      'licensing_portal_http_request_duration_seconds_bucket{method="GET",route="/api/v1/applications/:id/audit",status="200",le="0.025"} 1',
    );
  });

  it('tracks server errors in the snapshot', () => {
    const service = new MetricsService(configService as never);

    service.recordHttpRequest({
      method: 'POST',
      route: '/api/v1/auth/login',
      statusCode: 500,
      durationSeconds: 0.1,
    });

    expect(service.snapshot()).toMatchObject({ requestCount: 1, errorCount: 1 });
  });
});
