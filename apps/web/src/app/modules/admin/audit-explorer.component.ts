import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { finalize } from 'rxjs';

import {
  ApplicationAuditResponse,
  AuditChainVerificationResult,
} from '../../core/interfaces/audit.interface';
import { FieldConfig } from '../../core/interfaces/form.interface';
import { AuditService } from '../../core/services/audit.service';
import { normalizePagedResponse } from '../../core/utils/api-list-normalizer';
import { formatDateTime } from '../../core/utils/application-view.mapper';
import {
  auditPayloadSummary,
  formatAuditAction,
  formatAuditActor,
  formatAuditTransition,
  shortAuditHash,
} from '../../core/utils/audit-view.mapper';
import { ButtonComponent } from '../../shared/components/button/button.component';
import { ErrorStateComponent } from '../../shared/components/error-state/error-state.component';
import { InputsComponent } from '../../shared/components/inputs/inputs.component';
import { LoadingStateComponent } from '../../shared/components/loading-state/loading-state.component';

@Component({
  selector: 'app-audit-explorer',
  standalone: true,
  imports: [
    ButtonComponent,
    ErrorStateComponent,
    InputsComponent,
    LoadingStateComponent,
    ReactiveFormsModule,
  ],
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
    placeholder: 'e.g. 694e9dc6-f04a-4e1b-a355-f7397310d1b9',
  };

  entries: ApplicationAuditResponse[] = [];
  verification: AuditChainVerificationResult | null = null;
  totalRecords = 0;
  totalPages = 1;
  currentPage = 0;
  readonly pageSize = 20;
  isLoading = false;
  isVerifying = false;
  hasError = false;
  errorMessage = 'Unable to load audit entries.';

  load(page = 0): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.isLoading = true;
    this.verification = null;
    this.entries = [];
    this.totalRecords = 0;
    this.totalPages = 1;
    this.hasError = false;
    this.currentPage = page;
    this.auditService
      .list(this.form.controls.applicationId.value, { page: this.currentPage, size: this.pageSize })
      .pipe(finalize(() => (this.isLoading = false)))
      .subscribe({
        next: (response) => {
          const pageResponse = normalizePagedResponse(response);
          this.entries = pageResponse.records;
          this.totalRecords = pageResponse.totalRecords;
          this.totalPages = pageResponse.totalPages;
        },
        error: () => {
          this.hasError = true;
          this.errorMessage =
            'No audit entries were loaded. Check the application ID and try again.';
        },
      });
  }

  verify(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.isVerifying = true;
    this.auditService
      .verify(this.form.controls.applicationId.value)
      .pipe(finalize(() => (this.isVerifying = false)))
      .subscribe({
        next: (result) => (this.verification = result),
        error: () =>
          (this.verification = {
            valid: false,
            checkedEntries: 0,
            reason: 'Unable to verify this chain. Check the application ID and access rights.',
          }),
      });
  }

  formatted(value: string): string {
    return formatDateTime(value);
  }

  actionLabel(entry: ApplicationAuditResponse): string {
    return formatAuditAction(entry.action);
  }

  actorLabel(entry: ApplicationAuditResponse): string {
    return formatAuditActor(entry);
  }

  transitionLabel(entry: ApplicationAuditResponse): string {
    return formatAuditTransition(entry);
  }

  payloadLabel(entry: ApplicationAuditResponse): string {
    return auditPayloadSummary(entry.payload);
  }

  hashLabel(hash: string | null): string {
    return shortAuditHash(hash);
  }

  previousPage(): void {
    if (this.currentPage > 0) {
      this.load(this.currentPage - 1);
    }
  }

  nextPage(): void {
    if (this.currentPage + 1 < this.totalPages) {
      this.load(this.currentPage + 1);
    }
  }
}
