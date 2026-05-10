import { ApplicationAuditResponse } from '../../interfaces/audit.interface';
import { TableConfig } from '../../interfaces/table.interface';
import {
  formatAuditAction,
  formatAuditActor,
  formatAuditTransition,
  shortAuditHash,
} from '../../utils/audit-view.mapper';

export const auditTableConfig: TableConfig<ApplicationAuditResponse> = {
  trackBy: 'id',
  title: 'Audit trail',
  emptyTitle: 'No audit entries found',
  emptyMessage: 'Actions taken on this application will appear here.',
  columns: [
    { key: 'occurredAt', label: 'Timestamp', type: 'date' },
    {
      key: 'action',
      label: 'Action',
      type: 'text',
      format: (_value, row) => formatAuditAction(row.action),
    },
    {
      key: 'actorId',
      label: 'Actor',
      type: 'text',
      format: (_value, row) => formatAuditActor(row),
    },
    {
      key: 'fromState',
      label: 'State change',
      type: 'text',
      format: (_value, row) => formatAuditTransition(row),
    },
    { key: 'justification', label: 'Justification', type: 'text' },
    {
      key: 'entryHash',
      label: 'Entry hash',
      type: 'text',
      format: (value) => shortAuditHash(String(value)),
    },
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
