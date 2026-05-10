import { UserRole } from '../enums/user-role.enum';

export const roleHome = (role: UserRole): string => {
  switch (role) {
    case UserRole.Applicant:
      return '/applicant';
    case UserRole.Reviewer:
      return '/reviewer/queue';
    case UserRole.Approver:
      return '/approver';
    case UserRole.Admin:
      return '/admin/users';
  }
};
