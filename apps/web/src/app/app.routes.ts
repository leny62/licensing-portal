import { Routes } from '@angular/router';

import { UserRole } from './core/enums/user-role.enum';
import { authGuard } from './core/guards/auth.guard';
import { roleGuard } from './core/guards/role.guard';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () =>
      import('./modules/auth/login/login.component').then((module) => module.LoginComponent),
  },
  {
    path: 'auth/mfa',
    loadComponent: () =>
      import('./modules/auth/mfa/mfa.component').then((module) => module.MfaComponent),
  },
  {
    path: 'no-access',
    loadComponent: () =>
      import('./modules/shell/no-access.component').then((module) => module.NoAccessComponent),
  },
  {
    path: '',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./modules/shell/shell.component').then((module) => module.ShellComponent),
    children: [
      {
        path: 'applicant',
        canActivate: [roleGuard],
        data: { roles: [UserRole.Applicant] },
        loadComponent: () =>
          import('./modules/applicant/applicant-applications.component').then(
            (module) => module.ApplicantApplicationsComponent,
          ),
      },
      {
        path: 'reviewer/queue',
        canActivate: [roleGuard],
        data: { roles: [UserRole.Reviewer] },
        loadComponent: () =>
          import('./modules/reviewer/reviewer-queue.component').then(
            (module) => module.ReviewerQueueComponent,
          ),
      },
      {
        path: 'reviewer/assignments',
        canActivate: [roleGuard],
        data: { roles: [UserRole.Reviewer] },
        loadComponent: () =>
          import('./modules/reviewer/reviewer-assignments.component').then(
            (module) => module.ReviewerAssignmentsComponent,
          ),
      },
      {
        path: 'approver',
        canActivate: [roleGuard],
        data: { roles: [UserRole.Approver] },
        loadComponent: () =>
          import('./modules/approver/approver-queue.component').then(
            (module) => module.ApproverQueueComponent,
          ),
      },
      {
        path: 'admin/users',
        canActivate: [roleGuard],
        data: { roles: [UserRole.Admin] },
        loadComponent: () =>
          import('./modules/admin/admin-users.component').then(
            (module) => module.AdminUsersComponent,
          ),
      },
      {
        path: 'admin/audit',
        canActivate: [roleGuard],
        data: { roles: [UserRole.Admin] },
        loadComponent: () =>
          import('./modules/admin/audit-explorer.component').then(
            (module) => module.AuditExplorerComponent,
          ),
      },
      {
        path: 'applications/:id',
        loadComponent: () =>
          import('./modules/applications/application-detail/application-detail.component').then(
            (module) => module.ApplicationDetailComponent,
          ),
      },
      {
        path: 'notifications',
        loadComponent: () =>
          import('./modules/notifications/notifications-page.component').then(
            (module) => module.NotificationsPageComponent,
          ),
      },
      {
        path: '',
        pathMatch: 'full',
        loadComponent: () =>
          import('./modules/shell/role-redirect.component').then(
            (module) => module.RoleRedirectComponent,
          ),
      },
    ],
  },
  {
    path: '**',
    redirectTo: 'login',
  },
];
