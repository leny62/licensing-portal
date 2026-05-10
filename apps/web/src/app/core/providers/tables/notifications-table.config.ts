import { NotificationResponse } from '../../interfaces/notification.interface';
import { TableConfig } from '../../interfaces/table.interface';

export const notificationsTableConfig: TableConfig<NotificationResponse> = {
  trackBy: 'id',
  title: 'Notification history',
  searchPlaceholder: 'Search notification type or application',
  emptyTitle: 'No notifications',
  emptyMessage: 'Workflow updates will appear here.',
  filters: [
    {
      label: 'Status',
      key: 'readAt',
      predicate: (row, selected) =>
        selected === 'READ' ? row.readAt !== null : row.readAt === null,
      options: [
        { label: 'Unread', value: null },
        { label: 'Read', value: 'READ' },
      ],
    },
  ],
  columns: [
    { key: 'type', label: 'Type', type: 'text' },
    {
      key: 'applicationId',
      label: 'Application',
      type: 'text',
      format: (value) => String(value ?? 'Not linked'),
    },
    { key: 'createdAt', label: 'Created', type: 'date' },
    {
      key: 'readAt',
      label: 'Status',
      type: 'text',
      format: (value) => (value ? 'Read' : 'Unread'),
    },
    {
      key: 'id',
      label: '',
      type: 'action-menu',
      actions: [{ id: 'read', label: 'Mark read', icon: 'done' }],
    },
  ],
};
