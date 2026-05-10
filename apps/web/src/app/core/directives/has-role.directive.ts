import { Directive, Input, TemplateRef, ViewContainerRef, effect } from '@angular/core';

import { UserRole } from '../enums/user-role.enum';
import { AuthService } from '../services/auth.service';

@Directive({
  selector: '[appHasRole]',
  standalone: true,
})
export class HasRoleDirective {
  private roles: UserRole[] = [];

  constructor(
    private readonly templateRef: TemplateRef<unknown>,
    private readonly viewContainer: ViewContainerRef,
    private readonly auth: AuthService,
  ) {
    effect(() => this.render());
  }

  @Input()
  set appHasRole(roles: UserRole[]) {
    this.roles = roles;
    this.render();
  }

  private render(): void {
    const user = this.auth.currentUser();
    const canShow = user !== null && this.roles.includes(user.role);

    this.viewContainer.clear();

    if (canShow) {
      this.viewContainer.createEmbeddedView(this.templateRef);
    }
  }
}
