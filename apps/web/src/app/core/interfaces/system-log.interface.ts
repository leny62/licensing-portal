import { SystemLogLevel } from '../enums/system-log-level.enum';

export interface SystemLogResponse {
  id: string;
  occurredAt: string;
  userId: string | null;
  userName: string | null;
  level: SystemLogLevel;
  method: string | null;
  url: string;
  message: string;
  requestId: string | null;
  exception: string | null;
  logger: string | null;
  hostAddress: string | null;
  browser: string | null;
  serverName: string | null;
  code: string | null;
  deviceId: string | null;
  thread: string | null;
  businessLayer: string | null;
  applicationName: string;
}

export interface ListSystemLogsQuery {
  level?: SystemLogLevel;
  logger?: string;
  userName?: string;
  q?: string;
  from?: string;
  to?: string;
  page?: number;
  size?: number;
}
