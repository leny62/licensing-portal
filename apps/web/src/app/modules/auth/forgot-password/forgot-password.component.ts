import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { finalize } from 'rxjs';

import { FieldConfig } from '../../../core/interfaces/form.interface';
import { AuthService } from '../../../core/services/auth.service';
import { ButtonComponent } from '../../../shared/components/button/button.component';
import { InputsComponent } from '../../../shared/components/inputs/inputs.component';

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [ButtonComponent, InputsComponent, MatIconModule, ReactiveFormsModule, RouterLink],
  templateUrl: './forgot-password.component.html',
  styleUrl: './forgot-password.component.scss',
})
export class ForgotPasswordComponent {
  private readonly auth = inject(AuthService);
  private readonly fb = inject(FormBuilder);

  readonly form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
  });

  readonly emailField: FieldConfig = {
    name: 'email',
    type: 'email',
    label: 'Work email',
    placeholder: 'name@institution.gov',
  };

  isLoading = false;
  success = false;
  errorMessage = '';

  submit(): void {
    this.form.markAllAsTouched();

    if (this.form.invalid) {
      return;
    }

    this.isLoading = true;
    this.success = false;
    this.errorMessage = '';

    this.auth
      .requestPasswordReset(this.form.getRawValue())
      .pipe(finalize(() => (this.isLoading = false)))
      .subscribe({
        next: () => (this.success = true),
        error: () => (this.errorMessage = 'Unable to accept the reset request right now.'),
      });
  }
}
