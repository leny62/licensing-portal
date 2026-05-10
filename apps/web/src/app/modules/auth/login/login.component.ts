import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';

import { ApiErrorEnvelope } from '../../../core/interfaces/api-error.interface';
import { FieldConfig } from '../../../core/interfaces/form.interface';
import { AuthService } from '../../../core/services/auth.service';
import { ButtonComponent } from '../../../shared/components/button/button.component';
import { InputsComponent } from '../../../shared/components/inputs/inputs.component';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [ButtonComponent, InputsComponent, MatIconModule, ReactiveFormsModule, RouterLink],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss',
})
export class LoginComponent {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  readonly form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(8)]],
  });

  readonly emailField: FieldConfig = {
    name: 'email',
    type: 'email',
    label: 'Work email',
    placeholder: 'name@institution.gov',
  };

  readonly passwordField: FieldConfig = {
    name: 'password',
    type: 'password',
    label: 'Password',
    placeholder: 'Enter your password',
  };

  isLoading = false;
  errorMessage = '';

  submit(): void {
    this.form.markAllAsTouched();

    if (this.form.invalid) {
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';

    this.auth.login(this.form.getRawValue()).subscribe({
      next: (response) => {
        this.isLoading = false;

        if ('mfaRequired' in response) {
          void this.router.navigateByUrl('/auth/mfa');
          return;
        }

        this.auth.redirectToRoleHome();
      },
      error: (error: unknown) => {
        this.isLoading = false;
        this.errorMessage = this.messageFromError(error);
      },
    });
  }

  private messageFromError(error: unknown): string {
    if (error instanceof HttpErrorResponse) {
      return (
        (error.error as ApiErrorEnvelope | undefined)?.error?.message ??
        'Unable to sign in with those credentials.'
      );
    }

    return 'Unable to sign in with those credentials.';
  }
}
