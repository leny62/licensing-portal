import { NotificationType, Prisma } from '@prisma/client';

export interface NotificationResponse {
  id: string;
  userId: string;
  applicationId: string | null;
  type: NotificationType;
  payload: Prisma.JsonValue;
  readAt: Date | null;
  createdAt: Date;
}
