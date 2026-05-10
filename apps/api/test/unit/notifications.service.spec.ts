import { ForbiddenException } from '@nestjs/common';
import { NotificationType } from '@prisma/client';

import { PrismaService } from '../../src/infra/prisma/prisma.service';
import { NotificationsService } from '../../src/modules/notifications/notifications.service';

const now = new Date('2026-05-10T06:00:00.000Z');
const notification = {
  id: 'notification-1',
  userId: 'user-1',
  applicationId: 'application-1',
  type: NotificationType.REQUEST_INFO,
  payload: {},
  readAt: null,
  createdAt: now,
};

describe('NotificationsService', () => {
  const createService = () => {
    const prisma = {
      notification: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
        create: jest.fn(),
      },
    };

    return {
      prisma,
      service: new NotificationsService(prisma as unknown as PrismaService),
    };
  };

  it('lists notifications for the current user', async () => {
    const { prisma, service } = createService();
    prisma.notification.findMany.mockResolvedValue([notification]);

    await expect(service.listForUser('user-1')).resolves.toHaveLength(1);
    expect(prisma.notification.findMany).toHaveBeenCalledWith({
      where: { userId: 'user-1' },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  });

  it('marks unread notifications read', async () => {
    const { prisma, service } = createService();
    prisma.notification.findUnique.mockResolvedValue(notification);
    prisma.notification.update.mockResolvedValue({ ...notification, readAt: now });

    const result = await service.markRead('user-1', 'notification-1');

    expect(result.readAt).toBe(now);
  });

  it('is idempotent when notification is already read', async () => {
    const { prisma, service } = createService();
    prisma.notification.findUnique.mockResolvedValue({ ...notification, readAt: now });

    const result = await service.markRead('user-1', 'notification-1');

    expect(result.readAt).toBe(now);
    expect(prisma.notification.update).not.toHaveBeenCalled();
  });

  it('rejects reading another user notification', async () => {
    const { prisma, service } = createService();
    prisma.notification.findUnique.mockResolvedValue({ ...notification, userId: 'other-user' });

    await expect(service.markRead('user-1', 'notification-1')).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });
});
