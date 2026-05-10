import { DatePipe } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';

import { FieldConfig } from '../../core/interfaces/form.interface';
import { UserResponse } from '../../core/interfaces/user.interface';
import { NotifyService } from '../../core/services/notify.service';
import { UsersService } from '../../core/services/users.service';
import { ButtonComponent } from '../../shared/components/button/button.component';
import { ErrorStateComponent } from '../../shared/components/error-state/error-state.component';
import { InputsComponent } from '../../shared/components/inputs/inputs.component';
import { LoadingStateComponent } from '../../shared/components/loading-state/loading-state.component';

@Component({
  selector: 'app-user-detail',
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
  templateUrl: './user-detail.component.html',
  styleUrl: './user-detail.component.scss',
})
export class UserDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly usersService = inject(UsersService);
  private readonly notify = inject(NotifyService);
  private readonly fb = inject(FormBuilder);

  readonly form = this.fb.nonNullable.group({
    newPassword: ['', [Validators.required, Validators.minLength(12)]],
  });

  readonly passwordField: FieldConfig = {
    name: 'newPassword',
    type: 'password',
    label: 'Temporary password',
    placeholder: 'At least 12 characters',
  };

  user: UserResponse | null = null;
  isLoading = true;
  hasError = false;
  isSaving = false;

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    const id = this.route.snapshot.paramMap.get('id');

    if (id === null) {
      this.hasError = true;
      this.isLoading = false;
      return;
    }

    this.isLoading = true;
    this.hasError = false;
    this.usersService
      .get(id)
      .pipe(finalize(() => (this.isLoading = false)))
      .subscribe({
        next: (user) => (this.user = user),
        error: () => (this.hasError = true),
      });
  }

  resetPassword(): void {
    if (this.user === null) {
      return;
    }

    this.form.markAllAsTouched();

    if (this.form.invalid) {
      return;
    }

    this.isSaving = true;
    this.usersService
      .resetPassword(this.user.id, this.form.getRawValue())
      .pipe(finalize(() => (this.isSaving = false)))
      .subscribe({
        next: () => {
          this.notify.success('Password reset. Existing sessions were revoked.');
          this.form.reset();
        },
        error: () => this.notify.error('Password reset failed.'),
      });
  }
}
