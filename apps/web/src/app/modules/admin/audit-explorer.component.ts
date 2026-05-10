import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { finalize } from 'rxjs';

import {
  ApplicationAuditResponse,
  AuditChainVerificationResult,
} from '../../core/interfaces/audit.interface';
import { FieldConfig } from '../../core/interfaces/form.interface';
import { TableActionEvent, TablePageEvent } from '../../core/interfaces/table.interface';
import { auditTableConfig } from '../../core/providers/tables/audit-table.config';
import { AuditService } from '../../core/services/audit.service';
import { normalizePagedResponse } from '../../core/utils/api-list-normalizer';
import { AuditEntryDialogComponent } from '../../shared/components/audit-entry-dialog/audit-entry-dialog.component';
import { ButtonComponent } from '../../shared/components/button/button.component';
import { ErrorStateComponent } from '../../shared/components/error-state/error-state.component';
import { InputsComponent } from '../../shared/components/inputs/inputs.component';
import { TableComponent } from '../../shared/components/table/table.component';

@Component({
  selector: 'app-audit-explorer',
  standalone: true,
  imports: [
    ButtonComponent,
    ErrorStateComponent,
    InputsComponent,
    ReactiveFormsModule,
    TableComponent,
  ],
  templateUrl: './audit-explorer.component.html',
})
export class AuditExplorerComponent {
  private readonly fb = inject(FormBuilder);
  private readonly auditService = inject(AuditService);
  private readonly dialog = inject(MatDialog);

  readonly form = this.fb.nonNullable.group({
    applicationId: ['', [Validators.required]],
  });
  readonly tableConfig = auditTableConfig;

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

  handleAction(event: TableActionEvent<ApplicationAuditResponse>): void {
    if (event.actionId === 'view') {
      this.dialog.open(AuditEntryDialogComponent, {
        width: '760px',
        maxWidth: '95vw',
        maxHeight: '94vh',
        data: { entry: event.row },
      });
    }
  }

  handlePage(event: TablePageEvent): void {
    this.currentPage = Math.max((event.pageNumber || 1) - 1, 0);
    this.load(this.currentPage);
  }
}
