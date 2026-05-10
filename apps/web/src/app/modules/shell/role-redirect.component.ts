import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';

import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-role-redirect',
  standalone: true,
  template: '',
})
export class RoleRedirectComponent implements OnInit {
  constructor(
    private readonly auth: AuthService,
    private readonly router: Router,
  ) {}

  ngOnInit(): void {
    const user = this.auth.currentUser();

    if (user === null) {
      void this.router.navigateByUrl('/login');
      return;
    }

    this.auth.redirectToRoleHome();
  }
}
