import { DatePipe } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs';

import { FieldConfig } from '../../core/interfaces/form.interface';
import { UserResponse } from '../../core/interfaces/user.interface';
import { AuthService } from '../../core/services/auth.service';
import { NotifyService } from '../../core/services/notify.service';
import { UsersService } from '../../core/services/users.service';
import { ButtonComponent } from '../../shared/components/button/button.component';
import { ErrorStateComponent } from '../../shared/components/error-state/error-state.component';
import { InputsComponent } from '../../shared/components/inputs/inputs.component';
import { LoadingStateComponent } from '../../shared/components/loading-state/loading-state.component';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [
    ButtonComponent,
    DatePipe,
    ErrorStateComponent,
    InputsComponent,
    LoadingStateComponent,
    ReactiveFormsModule,
    RouterLink,
  ],
  templateUrl: './profile.component.html',
  styleUrl: './profile.component.scss',
})
export class ProfileComponent implements OnInit {
  private readonly usersService = inject(UsersService);
  private readonly auth = inject(AuthService);
  private readonly notify = inject(NotifyService);
  private readonly fb = inject(FormBuilder);

  readonly form = this.fb.nonNullable.group({
    currentPassword: ['', [Validators.required, Validators.minLength(8)]],
    newPassword: ['', [Validators.required, Validators.minLength(12)]],
    confirmPassword: ['', [Validators.required, Validators.minLength(12)]],
  });

  readonly currentPasswordField: FieldConfig = {
    name: 'currentPassword',
    type: 'password',
    label: 'Current password',
    placeholder: 'Enter current password',
  };

  readonly newPasswordField: FieldConfig = {
    name: 'newPassword',
    type: 'password',
    label: 'New password',
    placeholder: 'At least 12 characters',
  };

  readonly confirmPasswordField: FieldConfig = {
    name: 'confirmPassword',
    type: 'password',
    label: 'Confirm password',
    placeholder: 'Re-enter new password',
  };

  user: UserResponse | null = null;
  isLoading = true;
  hasError = false;
  isSaving = false;

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.isLoading = true;
    this.hasError = false;
    this.usersService
      .me()
      .pipe(finalize(() => (this.isLoading = false)))
      .subscribe({
        next: (user) => (this.user = user),
        error: () => (this.hasError = true),
      });
  }

  submit(): void {
    this.form.markAllAsTouched();

    if (this.form.invalid) {
      return;
    }

    const value = this.form.getRawValue();
    if (value.newPassword !== value.confirmPassword) {
      this.notify.warning('New passwords do not match.');
      return;
    }

    this.isSaving = true;
    this.auth
      .changePassword({
        currentPassword: value.currentPassword,
        newPassword: value.newPassword,
      })
      .pipe(finalize(() => (this.isSaving = false)))
      .subscribe({
        next: () => {
          this.notify.success('Password updated. Please sign in again.');
          this.form.reset();
          this.auth.logout().subscribe();
        },
        error: () => this.notify.error('Password update failed. Check the current password.'),
      });
  }
}
