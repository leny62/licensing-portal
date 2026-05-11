export interface HttpMetricInput {
  method: string;
  route: string;
  statusCode: number;
  durationSeconds: number;
}

export interface MetricsSnapshot {
  startedAt: Date;
  requestCount: number;
  errorCount: number;
}
