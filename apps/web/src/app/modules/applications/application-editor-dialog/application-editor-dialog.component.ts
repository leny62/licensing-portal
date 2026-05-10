import { Component, inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';

import { applicationFormConfig } from '../../../core/providers/forms/application-form.config';
import {
  ApplicationResponse,
  CreateApplicationRequest,
} from '../../../core/interfaces/application.interface';
import { ApplicationsService } from '../../../core/services/applications.service';
import { NotifyService } from '../../../core/services/notify.service';
import { ButtonComponent } from '../../../shared/components/button/button.component';
import { FormbuilderComponent } from '../../../shared/components/formbuilder/formbuilder.component';

export interface ApplicationEditorData {
  application?: ApplicationResponse;
}

@Component({
  selector: 'app-application-editor-dialog',
  standalone: true,
  imports: [ButtonComponent, FormbuilderComponent, MatDialogModule],
  templateUrl: './application-editor-dialog.component.html',
})
export class ApplicationEditorDialogComponent {
  private readonly applicationsService = inject(ApplicationsService);
  private readonly notify = inject(NotifyService);
  private readonly dialogRef =
    inject<MatDialogRef<ApplicationEditorDialogComponent, { success: boolean }>>(MatDialogRef);
  readonly data = inject<ApplicationEditorData>(MAT_DIALOG_DATA);
  readonly steps = applicationFormConfig();
  readonly title = this.data.application === undefined ? 'Create application' : 'Edit application';
  readonly initialData = this.data.application ?? {};
  isSaving = false;

  submit(payload: Record<string, unknown>): void {
    const body = this.flatten(payload);
    this.isSaving = true;

    const request =
      this.data.application === undefined
        ? this.applicationsService.create(body)
        : this.applicationsService.update(this.data.application.id, body);

    request.subscribe({
      next: () => {
        this.isSaving = false;
        this.notify.success('Application saved.');
        this.dialogRef.close({ success: true });
      },
      error: () => {
        this.isSaving = false;
        this.notify.error('Unable to save the application.');
      },
    });
  }

  close(): void {
    this.dialogRef.close({ success: false });
  }

  private flatten(payload: Record<string, unknown>): CreateApplicationRequest {
    const merged = Object.values(payload).reduce<Record<string, unknown>>((result, value) => {
      if (typeof value === 'object' && value !== null) {
        return { ...result, ...(value as Record<string, unknown>) };
      }

      return result;
    }, {});

    return {
      institutionName: String(merged['institutionName'] ?? ''),
      legalForm: String(merged['legalForm'] ?? ''),
      country: String(merged['country'] ?? ''),
      contactPerson: String(merged['contactPerson'] ?? ''),
      contactEmail: String(merged['contactEmail'] ?? ''),
      contactPhone: String(merged['contactPhone'] ?? ''),
      summary: String(merged['summary'] ?? ''),
    };
  }
}
