import { ApplicationResponse } from '../../interfaces/application.interface';
import { TableAction, TableColumn, TableConfig } from '../../interfaces/table.interface';
import { ApplicationState } from '../../enums/application-state.enum';

const baseColumns: TableColumn<ApplicationResponse>[] = [
  { key: 'referenceNumber', label: 'Reference', type: 'text', sortable: true },
  { key: 'institutionName', label: 'Institution', type: 'text', sortable: true },
  { key: 'state', label: 'State', type: 'badge' },
  { key: 'updatedAt', label: 'Last updated', type: 'date', sortable: true },
];

const commonFilters: TableConfig<ApplicationResponse>['filters'] = [
  {
    label: 'State',
    key: 'state',
    options: [
      { label: 'Draft', value: ApplicationState.Draft },
      { label: 'Submitted', value: ApplicationState.Submitted },
      { label: 'Under review', value: ApplicationState.UnderReview },
      {
        label: 'Awaiting applicant response',
        value: ApplicationState.AwaitingApplicantResponse,
      },
      { label: 'Recommended approval', value: ApplicationState.RecommendedForApproval },
      { label: 'Recommended rejection', value: ApplicationState.RecommendedForRejection },
      { label: 'Approved', value: ApplicationState.Approved },
      { label: 'Rejected', value: ApplicationState.Rejected },
      { label: 'Withdrawn', value: ApplicationState.Withdrawn },
    ],
  },
];

const viewAction: TableAction<ApplicationResponse> = {
  id: 'view',
  label: 'Open',
  icon: 'visibility',
  tone: 'primary',
};

function configWithActions(
  title: string,
  actions: TableAction<ApplicationResponse>[],
): TableConfig<ApplicationResponse> {
  return {
    trackBy: 'id',
    title,
    searchPlaceholder: 'Search reference, institution, contact',
    emptyTitle: 'No applications found',
    emptyMessage: 'Applications matching this view will appear here.',
    filters: commonFilters,
    columns: [
      ...baseColumns,
      {
        key: 'id',
        label: '',
        type: 'action-menu',
        actions,
      },
    ],
  };
}

export const applicantApplicationTableConfig = configWithActions('My application register', [
  viewAction,
  {
    id: 'edit',
    label: 'Edit',
    icon: 'edit',
    visible: (row) =>
      row.state === ApplicationState.Draft ||
      row.state === ApplicationState.AwaitingApplicantResponse,
  },
  {
    id: 'submit',
    label: 'Submit',
    icon: 'send',
    tone: 'success',
    visible: (row) => row.state === ApplicationState.Draft,
  },
  {
    id: 'withdraw',
    label: 'Withdraw',
    icon: 'block',
    tone: 'danger',
    visible: (row) =>
      [
        ApplicationState.Draft,
        ApplicationState.Submitted,
        ApplicationState.UnderReview,
        ApplicationState.AwaitingApplicantResponse,
      ].includes(row.state),
  },
  {
    id: 'resubmit',
    label: 'Resubmit',
    icon: 'replay',
    tone: 'success',
    visible: (row) => row.state === ApplicationState.AwaitingApplicantResponse,
  },
]);

export const reviewerQueueApplicationTableConfig = configWithActions('Submitted queue', [
  viewAction,
  {
    id: 'claim',
    label: 'Claim',
    icon: 'assignment_ind',
    tone: 'primary',
    visible: (row) => row.state === ApplicationState.Submitted,
  },
]);

export const reviewerAssignmentsApplicationTableConfig = configWithActions('Assigned reviews', [
  viewAction,
]);

export const approverApplicationTableConfig = configWithActions('Decision queue', [viewAction]);

export const applicationTableConfig = applicantApplicationTableConfig;
