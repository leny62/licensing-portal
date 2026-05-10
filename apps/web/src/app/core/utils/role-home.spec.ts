import { UserRole } from '../enums/user-role.enum';
import { roleHome } from './role-home';

describe(roleHome.name, () => {
  it('maps each role to its landing route', () => {
    expect(roleHome(UserRole.Applicant)).toBe('/applicant');
    expect(roleHome(UserRole.Reviewer)).toBe('/reviewer/queue');
    expect(roleHome(UserRole.Approver)).toBe('/approver');
    expect(roleHome(UserRole.Admin)).toBe('/admin/users');
  });
});
