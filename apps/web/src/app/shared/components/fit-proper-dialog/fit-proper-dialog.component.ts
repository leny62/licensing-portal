import { Component, Inject, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';

import { FitAndProperStatus } from '../../../core/enums/regulatory-status.enum';
import { FieldConfig, FormSelectData } from '../../../core/interfaces/form.interface';
import { ButtonComponent } from '../button/button.component';
import { InputsComponent } from '../inputs/inputs.component';

export interface FitProperDialogData {
  shareholderName: string;
}

export interface FitProperDialogResult {
  status: FitAndProperStatus.Cleared | FitAndProperStatus.Failed;
  justification: string;
}

@Component({
  selector: 'app-fit-proper-dialog',
  standalone: true,
  imports: [ButtonComponent, InputsComponent, MatDialogModule, ReactiveFormsModule],
  templateUrl: './fit-proper-dialog.component.html',
})
export class FitProperDialogComponent {
  private readonly fb = inject(FormBuilder);

  readonly statusField: FieldConfig = {
    name: 'status',
    type: 'select',
    label: 'Review outcome',
    selectData: 'statuses',
    validators: [Validators.required],
  };
  readonly justificationField: FieldConfig = {
    name: 'justification',
    type: 'textarea',
    label: 'Justification',
    placeholder: 'Record the evidence reviewed and the reason for this outcome.',
    rows: 5,
    validators: [Validators.required, Validators.minLength(12)],
  };
  readonly form = this.fb.nonNullable.group({
    status: [FitAndProperStatus.Cleared, [Validators.required]],
    justification: ['', [Validators.required, Validators.minLength(12)]],
  });
  readonly selectData: FormSelectData = {
    statuses: [
      { label: 'Cleared', value: FitAndProperStatus.Cleared },
      { label: 'Failed', value: FitAndProperStatus.Failed },
    ],
  };

  constructor(
    private readonly dialogRef: MatDialogRef<
      FitProperDialogComponent,
      FitProperDialogResult | false
    >,
    @Inject(MAT_DIALOG_DATA) readonly data: FitProperDialogData,
  ) {}

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const { status, justification } = this.form.getRawValue();

    if (status !== FitAndProperStatus.Cleared && status !== FitAndProperStatus.Failed) {
      return;
    }

    this.dialogRef.close({ status, justification });
  }

  cancel(): void {
    this.dialogRef.close(false);
  }
}
