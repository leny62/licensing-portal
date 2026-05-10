import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { finalize } from 'rxjs';

import {
  ApplicationAuditResponse,
  AuditChainVerificationResult,
} from '../../core/interfaces/audit.interface';
import { FieldConfig } from '../../core/interfaces/form.interface';
import { AuditService } from '../../core/services/audit.service';
import { formatDateTime } from '../../core/utils/application-view.mapper';
import { ButtonComponent } from '../../shared/components/button/button.component';
import { InputsComponent } from '../../shared/components/inputs/inputs.component';
import { LoadingStateComponent } from '../../shared/components/loading-state/loading-state.component';

@Component({
  selector: 'app-audit-explorer',
  standalone: true,
  imports: [ButtonComponent, InputsComponent, LoadingStateComponent, ReactiveFormsModule],
  templateUrl: './audit-explorer.component.html',
})
export class AuditExplorerComponent {
  private readonly fb = inject(FormBuilder);
  private readonly auditService = inject(AuditService);

  readonly form = this.fb.nonNullable.group({
    applicationId: ['', [Validators.required]],
  });

  readonly appIdField: FieldConfig = {
    name: 'applicationId',
    type: 'text',
    label: 'Application ID',
    placeholder: 'e.g. APP-2024-00042',
  };

  entries: ApplicationAuditResponse[] = [];
  verification: AuditChainVerificationResult | null = null;
  isLoading = false;

  load(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.isLoading = true;
    this.verification = null;
    this.auditService
      .list(this.form.controls.applicationId.value)
      .pipe(finalize(() => (this.isLoading = false)))
      .subscribe((entries) => (this.entries = entries));
  }

  verify(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.auditService
      .verify(this.form.controls.applicationId.value)
      .subscribe((result) => (this.verification = result));
  }

  formatted(value: string): string {
    return formatDateTime(value);
  }
}
