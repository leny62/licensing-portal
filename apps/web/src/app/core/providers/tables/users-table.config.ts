import { UserResponse } from '../../interfaces/user.interface';
import { TableConfig } from '../../interfaces/table.interface';
import { UserRole } from '../../enums/user-role.enum';

export const usersTableConfig: TableConfig<UserResponse> = {
  trackBy: 'id',
  title: 'User directory',
  searchPlaceholder: 'Search name, email, role',
  emptyTitle: 'No users found',
  emptyMessage: 'Create a user or adjust the filters.',
  filters: [
    {
      label: 'Role',
      key: 'role',
      options: [
        { label: 'Applicant', value: UserRole.Applicant },
        { label: 'Reviewer', value: UserRole.Reviewer },
        { label: 'Approver', value: UserRole.Approver },
        { label: 'Admin', value: UserRole.Admin },
      ],
    },
    {
      label: 'Status',
      key: 'isActive',
      options: [
        { label: 'Active', value: true },
        { label: 'Inactive', value: false },
      ],
    },
  ],
  columns: [
    { key: 'fullName', label: 'Name', type: 'text', sortable: true },
    { key: 'email', label: 'Email', type: 'text', sortable: true },
    { key: 'role', label: 'Role', type: 'badge' },
    {
      key: 'isActive',
      label: 'Status',
      type: 'badge',
      format: (value) => (value ? 'Active' : 'Inactive'),
    },
    { key: 'updatedAt', label: 'Last updated', type: 'date' },
    {
      key: 'id',
      label: '',
      type: 'action-menu',
      actions: [
        { id: 'view', label: 'View details', icon: 'visibility', tone: 'primary' },
        { id: 'edit', label: 'Edit', icon: 'edit' },
        {
          id: 'deactivate',
          label: 'Deactivate',
          icon: 'person_off',
          tone: 'danger',
          visible: (row) => row.isActive,
        },
        {
          id: 'reactivate',
          label: 'Reactivate',
          icon: 'person_add',
          tone: 'success',
          visible: (row) => !row.isActive,
        },
      ],
    },
  ],
};
