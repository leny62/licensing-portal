import { SystemLogLevel } from '@prisma/client';

export interface SystemLogResponse {
  id: string;
  occurredAt: Date;
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

export interface CreateSystemLogInput {
  userId?: string | null;
  userName?: string | null;
  level: SystemLogLevel;
  method?: string | null;
  url: string;
  message: string;
  requestId?: string | null;
  exception?: string | null;
  logger?: string | null;
  hostAddress?: string | null;
  browser?: string | null;
  serverName?: string | null;
  code?: string | null;
  deviceId?: string | null;
  thread?: string | null;
  businessLayer?: string | null;
  applicationName?: string;
}
