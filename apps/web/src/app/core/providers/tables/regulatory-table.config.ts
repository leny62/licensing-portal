import { DOCUMENT_SLOT_LABELS, DocumentSlot } from '../../enums/document-slot.enum';
import {
  ApplicationDecisionRecordResponse,
  ApplicationSlaClockResponse,
  ComplianceFindingRecordResponse,
  DocumentSlotSpecResponse,
  InformationLetterResponse,
  SeniorManagerResponse,
  SignificantShareholderResponse,
} from '../../interfaces/regulatory.interface';
import { TableColumn, TableConfig } from '../../interfaces/table.interface';
import { formatDateTime } from '../../utils/application-view.mapper';
import {
  formatPercent,
  seniorManagerRoleLabel,
  shareholderTypeLabel,
  transitionLabel,
} from '../../utils/regulatory-view.mapper';

const shareholderColumns: TableColumn<SignificantShareholderResponse>[] = [
  { key: 'fullName', label: 'Name', type: 'text' },
  {
    key: 'shareholderType',
    label: 'Type',
    type: 'text',
    format: (value) => shareholderTypeLabel(String(value)),
  },
  { key: 'country', label: 'Country', type: 'text' },
  {
    key: 'ownershipPercent',
    label: 'Ownership',
    type: 'text',
    format: (value) => formatPercent(String(value)),
  },
  { key: 'fitAndProperStatus', label: 'Fit and proper', type: 'badge' },
  { key: 'beneficialOwner', label: 'Beneficial owner', type: 'text' },
];

export const shareholdersReadonlyTableConfig: TableConfig<SignificantShareholderResponse> = {
  trackBy: 'id',
  title: 'Significant shareholders',
  emptyTitle: 'No shareholders recorded',
  emptyMessage: 'Add each significant shareholder and source-of-funds declaration.',
  columns: shareholderColumns,
};

export const shareholdersTableConfig: TableConfig<SignificantShareholderResponse> = {
  ...shareholdersReadonlyTableConfig,
  columns: [
    ...shareholderColumns,
    {
      key: 'id',
      label: 'Actions',
      type: 'action-menu',
      actions: [
        { id: 'edit', label: 'Edit', icon: 'edit', tone: 'primary' },
        { id: 'delete', label: 'Delete', icon: 'delete', tone: 'danger' },
      ],
    },
  ],
};

export const shareholdersReviewerTableConfig: TableConfig<SignificantShareholderResponse> = {
  ...shareholdersReadonlyTableConfig,
  columns: [
    ...shareholderColumns,
    {
      key: 'id',
      label: 'Actions',
      type: 'action-menu',
      actions: [
        {
          id: 'fit-and-proper',
          label: 'Mark fit-and-proper',
          icon: 'fact_check',
          tone: 'primary',
        },
      ],
    },
  ],
};

const seniorManagerColumns: TableColumn<SeniorManagerResponse>[] = [
  { key: 'fullName', label: 'Name', type: 'text' },
  {
    key: 'role',
    label: 'Role',
    type: 'text',
    format: (value) => seniorManagerRoleLabel(String(value)),
  },
  { key: 'email', label: 'Email', type: 'text' },
  { key: 'nationality', label: 'Nationality', type: 'text' },
  {
    key: 'fitAndProperAttested',
    label: 'Fit and proper',
    type: 'badge',
    format: (value) => (value === true ? 'Active' : 'Inactive'),
  },
];

export const seniorManagersReadonlyTableConfig: TableConfig<SeniorManagerResponse> = {
  trackBy: 'id',
  title: 'Senior managers',
  emptyTitle: 'No senior managers recorded',
  emptyMessage: 'Record senior managers and attest fit-and-proper status.',
  columns: seniorManagerColumns,
};

export const seniorManagersTableConfig: TableConfig<SeniorManagerResponse> = {
  ...seniorManagersReadonlyTableConfig,
  columns: [
    ...seniorManagerColumns,
    {
      key: 'id',
      label: 'Actions',
      type: 'action-menu',
      actions: [
        { id: 'edit', label: 'Edit', icon: 'edit', tone: 'primary' },
        { id: 'delete', label: 'Delete', icon: 'delete', tone: 'danger' },
      ],
    },
  ],
};

export const documentSlotSpecsTableConfig: TableConfig<DocumentSlotSpecResponse> = {
  trackBy: 'slot',
  title: 'Document slot rules',
  emptyTitle: 'No document rules found',
  emptyMessage: 'Document slot specifications will appear here after migration.',
  columns: [
    {
      key: 'slot',
      label: 'Slot',
      type: 'text',
      format: (value) => DOCUMENT_SLOT_LABELS[value as DocumentSlot] ?? String(value),
    },
    { key: 'ownerRole', label: 'Owner', type: 'badge' },
    {
      key: 'required',
      label: 'Required',
      type: 'badge',
      format: (value) => (value === true ? 'Active' : 'Inactive'),
    },
    {
      key: 'maxBytes',
      label: 'Max size',
      type: 'text',
      format: (value) => `${(Number(value) / (1024 * 1024)).toFixed(0)} MB`,
    },
    { key: 'regulatoryBasis', label: 'Basis', type: 'text' },
  ],
};

export const complianceFindingsTableConfig: TableConfig<ComplianceFindingRecordResponse> = {
  trackBy: 'id',
  title: 'Compliance findings',
  emptyTitle: 'No findings',
  emptyMessage: 'Blocking and review findings will appear after checklist evaluation.',
  columns: [
    { key: 'severity', label: 'Severity', type: 'badge' },
    { key: 'status', label: 'Status', type: 'badge' },
    { key: 'section', label: 'Section', type: 'text' },
    { key: 'title', label: 'Finding', type: 'text' },
    { key: 'regulatoryBasis', label: 'Basis', type: 'text' },
  ],
};

export const decisionsTableConfig: TableConfig<ApplicationDecisionRecordResponse> = {
  trackBy: 'id',
  title: 'Decision history',
  emptyTitle: 'No decisions recorded',
  emptyMessage: 'Recommendations and final decisions will appear here.',
  columns: [
    { key: 'createdAt', label: 'Date', type: 'date' },
    { key: 'outcome', label: 'Outcome', type: 'badge' },
    {
      key: 'fromState',
      label: 'Transition',
      type: 'text',
      format: (_value, row) => transitionLabel(row.fromState, row.toState),
    },
    { key: 'justification', label: 'Justification', type: 'text' },
  ],
};

export const informationLettersTableConfig: TableConfig<InformationLetterResponse> = {
  trackBy: 'id',
  title: 'Information letters',
  emptyTitle: 'No letters issued',
  emptyMessage: 'Formal requests for additional information will appear here.',
  columns: [
    { key: 'issuedAt', label: 'Issued', type: 'date' },
    { key: 'subject', label: 'Subject', type: 'text' },
    { key: 'status', label: 'Status', type: 'badge' },
    {
      key: 'responseDueAt',
      label: 'Due',
      type: 'text',
      format: (value) => formatDateTime(String(value)),
    },
    {
      key: 'id',
      label: 'Actions',
      type: 'action-menu',
      actions: [{ id: 'download', label: 'Download PDF', icon: 'download', tone: 'primary' }],
    },
  ],
};

export const slaClocksTableConfig: TableConfig<ApplicationSlaClockResponse> = {
  trackBy: 'id',
  title: 'SLA clocks',
  emptyTitle: 'No SLA clocks found',
  emptyMessage: 'SLA clocks are created when applications move through review states.',
  columns: [
    { key: 'state', label: 'State', type: 'badge' },
    { key: 'startedAt', label: 'Started', type: 'date' },
    { key: 'dueAt', label: 'Due', type: 'date' },
    {
      key: 'breachedAt',
      label: 'Breach',
      type: 'text',
      format: (value) => (value === null ? 'On time' : formatDateTime(String(value))),
    },
  ],
};
