export interface HealthResponse {
  status: HealthStatus;
  timestamp: string;
  uptimeSeconds: number;
  checks: Record<string, HealthCheck>;
}

export type HealthStatus = 'ok' | 'error';

export interface HealthCheck {
  status: HealthStatus;
  latencyMs?: number;
}
