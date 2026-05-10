import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';

import { ButtonComponent } from '../button/button.component';

export interface ConfirmDialogData {
  title: string;
  message: string;
  confirmLabel?: string;
  variant?: 'primary' | 'danger' | 'success';
}

@Component({
  selector: 'app-confirm-dialog',
  standalone: true,
  imports: [ButtonComponent, MatDialogModule],
  templateUrl: './confirm-dialog.component.html',
})
export class ConfirmDialogComponent {
  constructor(
    private readonly dialogRef: MatDialogRef<ConfirmDialogComponent, boolean>,
    @Inject(MAT_DIALOG_DATA) readonly data: ConfirmDialogData,
  ) {}

  close(result: boolean): void {
    this.dialogRef.close(result);
  }
}
