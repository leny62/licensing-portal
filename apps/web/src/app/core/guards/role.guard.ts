import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

import { UserRole } from '../enums/user-role.enum';
import { AuthService } from '../services/auth.service';

export const roleGuard: CanActivateFn = (route) => {
  const roles = (route.data['roles'] ?? []) as UserRole[];
  const user = inject(AuthService).currentUser();

  if (roles.length === 0 || (user !== null && roles.includes(user.role))) {
    return true;
  }

  return inject(Router).createUrlTree(['/no-access']);
};
