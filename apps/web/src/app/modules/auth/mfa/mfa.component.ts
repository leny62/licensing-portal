import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';

import { ApiErrorEnvelope } from '../../../core/interfaces/api-error.interface';
import { FieldConfig } from '../../../core/interfaces/form.interface';
import { AuthService } from '../../../core/services/auth.service';
import { ButtonComponent } from '../../../shared/components/button/button.component';
import { ConfirmDialogComponent } from '../../../shared/components/confirm-dialog/confirm-dialog.component';
import { InputsComponent } from '../../../shared/components/inputs/inputs.component';

@Component({
  selector: 'app-mfa',
  standalone: true,
  imports: [ButtonComponent, InputsComponent, MatIconModule, ReactiveFormsModule],
  templateUrl: './mfa.component.html',
  styleUrl: './mfa.component.scss',
})
export class MfaComponent {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly dialog = inject(MatDialog);

  readonly form: FormGroup = this.fb.nonNullable.group({
    code: ['', [Validators.required, Validators.minLength(6)]],
  });

  readonly codeField: FieldConfig = {
    name: 'code',
    type: 'text',
    label: 'TOTP or recovery code',
    placeholder: 'Enter 6-digit code or recovery code',
  };

  readonly isLoading = signal(false);
  readonly errorMessage = signal('');

  submit(): void {
    this.form.markAllAsTouched();
    if (this.form.invalid) return;

    const code = (this.form.controls['code'].value as string).trim();

    if (code.includes('-')) {
      this.dialog
        .open<ConfirmDialogComponent, unknown, boolean>(ConfirmDialogComponent, {
          width: '420px',
          data: {
            title: 'Use recovery code?',
            message:
              'Recovery codes are single-use. Continue only if this is the code you intend to consume.',
            confirmLabel: 'Use code',
          },
        })
        .afterClosed()
        .subscribe((confirmed) => {
          if (confirmed) this.complete(code);
        });
      return;
    }

    this.complete(code);
  }

  private complete(code: string): void {
    this.isLoading.set(true);
    this.errorMessage.set('');

    this.auth.completeMfa(code).subscribe({
      next: () => {
        this.isLoading.set(false);
        this.auth.redirectToRoleHome();
      },
      error: (error: unknown) => {
        this.isLoading.set(false);
        this.errorMessage.set(this.messageFromError(error));
      },
    });
  }

  private messageFromError(error: unknown): string {
    if (error instanceof HttpErrorResponse) {
      return (
        (error.error as ApiErrorEnvelope | undefined)?.error?.message ??
        'Unable to verify the code.'
      );
    }
    return error instanceof Error ? error.message : 'Unable to verify the code.';
  }
}
