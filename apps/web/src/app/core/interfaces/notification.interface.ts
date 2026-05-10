import { NotificationType } from '../enums/notification-type.enum';

export interface NotificationResponse {
  id: string;
  userId: string;
  applicationId: string | null;
  type: NotificationType;
  payload: Record<string, unknown>;
  readAt: string | null;
  createdAt: string;
}
