import { SystemLogLevel } from '../../enums/system-log-level.enum';
import { SystemLogResponse } from '../../interfaces/system-log.interface';
import { TableConfig } from '../../interfaces/table.interface';

export const systemLogsTableConfig: TableConfig<SystemLogResponse> = {
  trackBy: 'id',
  title: 'System log history',
  searchPlaceholder: 'Search URL, message, request ID, code',
  emptyTitle: 'No system logs found',
  emptyMessage: 'Try another search term, level, or date range.',
  filters: [
    {
      label: 'Level',
      key: 'level',
      options: [
        { label: 'Debug', value: SystemLogLevel.Debug },
        { label: 'Info', value: SystemLogLevel.Info },
        { label: 'Warn', value: SystemLogLevel.Warn },
        { label: 'Error', value: SystemLogLevel.Error },
      ],
    },
  ],
  columns: [
    { key: 'occurredAt', label: 'Date', type: 'date' },
    { key: 'level', label: 'Level', type: 'badge' },
    { key: 'userName', label: 'User', type: 'text' },
    {
      key: 'url',
      label: 'Request',
      type: 'text',
      format: (value, row) => `${row.method ?? 'REQUEST'} ${String(value)}`,
    },
    { key: 'code', label: 'Status', type: 'text' },
    { key: 'logger', label: 'Logger', type: 'text' },
    { key: 'message', label: 'Message', type: 'text' },
    {
      key: 'id',
      label: 'Actions',
      type: 'action-menu',
      actions: [
        {
          id: 'view',
          label: 'View details',
          icon: 'visibility',
          tone: 'primary',
        },
      ],
    },
  ],
};
