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
    { key: 'userName', label: 'UserName', type: 'text' },
    { key: 'level', label: 'Level', type: 'badge' },
    { key: 'url', label: 'Url', type: 'text' },
    { key: 'message', label: 'Message', type: 'text' },
    { key: 'requestId', label: 'RequestId', type: 'text' },
    { key: 'exception', label: 'Exception', type: 'text' },
    { key: 'logger', label: 'Logger', type: 'text' },
    { key: 'hostAddress', label: 'HostAddress', type: 'text' },
    { key: 'browser', label: 'Browser', type: 'text' },
    { key: 'serverName', label: 'ServerName', type: 'text' },
    { key: 'code', label: 'Code', type: 'text' },
    { key: 'deviceId', label: 'DeviceId', type: 'text' },
    { key: 'thread', label: 'Thread', type: 'text' },
    { key: 'applicationName', label: 'ApplicationName', type: 'text' },
  ],
};
