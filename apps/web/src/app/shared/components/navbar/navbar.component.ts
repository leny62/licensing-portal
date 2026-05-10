import { Component, computed, inject } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';

import { UserRole } from '../../../core/enums/user-role.enum';
import { AuthService } from '../../../core/services/auth.service';
import { ButtonComponent } from '../button/button.component';

interface NavItem {
  label: string;
  icon: string;
  path: string;
  roles: UserRole[];
}

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [ButtonComponent, MatIconModule, RouterLink, RouterLinkActive],
  templateUrl: './navbar.component.html',
  styleUrl: './navbar.component.scss',
})
export class NavbarComponent {
  private readonly auth = inject(AuthService);

  readonly user = this.auth.currentUser;
  readonly items = computed(() => {
    const user = this.user();

    if (user === null) {
      return [];
    }

    return this.navItems.filter((item) => item.roles.includes(user.role));
  });

  private readonly navItems: NavItem[] = [
    {
      label: 'My applications',
      icon: 'folder_open',
      path: '/applicant',
      roles: [UserRole.Applicant],
    },
    {
      label: 'Queue',
      icon: 'assignment',
      path: '/reviewer/queue',
      roles: [UserRole.Reviewer],
    },
    {
      label: 'Assignments',
      icon: 'fact_check',
      path: '/reviewer/assignments',
      roles: [UserRole.Reviewer],
    },
    {
      label: 'Ready queue',
      icon: 'verified',
      path: '/approver',
      roles: [UserRole.Approver],
    },
    {
      label: 'Users',
      icon: 'groups',
      path: '/admin/users',
      roles: [UserRole.Admin],
    },
    {
      label: 'Audit',
      icon: 'history',
      path: '/admin/audit',
      roles: [UserRole.Admin],
    },
    {
      label: 'System logs',
      icon: 'manage_search',
      path: '/admin/system-logs',
      roles: [UserRole.Admin],
    },
    {
      label: 'Notifications',
      icon: 'notifications',
      path: '/notifications',
      roles: [UserRole.Applicant, UserRole.Reviewer, UserRole.Approver, UserRole.Admin],
    },
  ];

  logout(): void {
    this.auth.logout().subscribe();
  }
}
