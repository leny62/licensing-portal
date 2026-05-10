import { ForbiddenException, Injectable } from '@nestjs/common';
import { Notification, NotificationType, Prisma } from '@prisma/client';

import { PrismaService } from '../../infra/prisma/prisma.service';
import { NotificationResponse } from './interfaces/notification-response.interface';

@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  async listForUser(userId: string): Promise<NotificationResponse[]> {
    const notifications = await this.prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    return notifications.map((notification) => this.mapNotification(notification));
  }

  async markRead(userId: string, notificationId: string): Promise<NotificationResponse> {
    const notification = await this.prisma.notification.findUnique({
      where: { id: notificationId },
    });

    if (notification === null || notification.userId !== userId) {
      throw new ForbiddenException('Access denied.');
    }

    if (notification.readAt !== null) {
      return this.mapNotification(notification);
    }

    return this.mapNotification(
      await this.prisma.notification.update({
        where: { id: notificationId },
        data: { readAt: new Date() },
      }),
    );
  }

  async create(
    userId: string,
    type: NotificationType,
    payload: Prisma.InputJsonValue,
    applicationId?: string,
  ): Promise<NotificationResponse> {
    const notification = await this.prisma.notification.create({
      data: {
        userId,
        type,
        payload,
        ...(applicationId !== undefined ? { applicationId } : {}),
      },
    });

    return this.mapNotification(notification);
  }

  private mapNotification(notification: Notification): NotificationResponse {
    return {
      id: notification.id,
      userId: notification.userId,
      applicationId: notification.applicationId,
      type: notification.type,
      payload: notification.payload,
      readAt: notification.readAt,
      createdAt: notification.createdAt,
    };
  }
}
