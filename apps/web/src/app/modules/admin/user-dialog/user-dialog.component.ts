import { Component, inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';

import { CreateUserRequest, UserResponse } from '../../../core/interfaces/user.interface';
import { userFormConfig } from '../../../core/providers/forms/user-form.config';
import { NotifyService } from '../../../core/services/notify.service';
import { UsersService } from '../../../core/services/users.service';
import { ButtonComponent } from '../../../shared/components/button/button.component';
import { FormbuilderComponent } from '../../../shared/components/formbuilder/formbuilder.component';

export interface UserDialogData {
  user?: UserResponse;
}

@Component({
  selector: 'app-user-dialog',
  standalone: true,
  imports: [ButtonComponent, FormbuilderComponent, MatDialogModule],
  templateUrl: './user-dialog.component.html',
})
export class UserDialogComponent {
  private readonly usersService = inject(UsersService);
  private readonly notify = inject(NotifyService);
  private readonly dialogRef =
    inject<MatDialogRef<UserDialogComponent, { success: boolean }>>(MatDialogRef);
  readonly data = inject<UserDialogData>(MAT_DIALOG_DATA);
  readonly isEdit = this.data.user !== undefined;
  readonly steps = userFormConfig(this.isEdit);
  readonly initialData = this.data.user ?? {};
  isSaving = false;

  submit(payload: Record<string, unknown>): void {
    const body = this.flatten(payload);
    this.isSaving = true;

    const request =
      this.data.user === undefined
        ? this.usersService.create(body)
        : this.usersService.update(this.data.user.id, {
            email: body.email,
            fullName: body.fullName,
            role: body.role,
            institutionName: body.institutionName,
          });

    request.subscribe({
      next: () => {
        this.isSaving = false;
        this.notify.success('User saved.');
        this.dialogRef.close({ success: true });
      },
      error: () => {
        this.isSaving = false;
        this.notify.error('Unable to save user.');
      },
    });
  }

  close(): void {
    this.dialogRef.close({ success: false });
  }

  private flatten(payload: Record<string, unknown>): CreateUserRequest {
    const merged = Object.values(payload).reduce<Record<string, unknown>>((result, value) => {
      if (typeof value === 'object' && value !== null) {
        return { ...result, ...(value as Record<string, unknown>) };
      }

      return result;
    }, {});

    return {
      email: String(merged['email'] ?? ''),
      password: String(merged['password'] ?? ''),
      fullName: String(merged['fullName'] ?? ''),
      role: merged['role'] as CreateUserRequest['role'],
      institutionName: String(merged['institutionName'] ?? '') || null,
    };
  }
}
