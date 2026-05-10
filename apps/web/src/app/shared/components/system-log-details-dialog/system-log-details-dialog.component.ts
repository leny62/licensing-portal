import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';

import { SystemLogDetailsDialogData } from '../../../core/interfaces/system-log-details-dialog.interface';
import { formatDateTime } from '../../../core/utils/application-view.mapper';
import { ButtonComponent } from '../button/button.component';
import { StatusBadgeComponent } from '../status-badge/status-badge.component';

@Component({
  selector: 'app-system-log-details-dialog',
  standalone: true,
  imports: [ButtonComponent, MatDialogModule, MatIconModule, StatusBadgeComponent],
  templateUrl: './system-log-details-dialog.component.html',
  styleUrl: './system-log-details-dialog.component.scss',
})
export class SystemLogDetailsDialogComponent {
  constructor(
    private readonly dialogRef: MatDialogRef<SystemLogDetailsDialogComponent>,
    @Inject(MAT_DIALOG_DATA) private readonly data: SystemLogDetailsDialogData,
  ) {}

  get log() {
    return this.data.log;
  }

  close(): void {
    this.dialogRef.close();
  }

  occurredAtLabel(): string {
    return formatDateTime(this.log.occurredAt);
  }

  requestLabel(): string {
    return `${this.log.method ?? 'REQUEST'} ${this.log.url}`;
  }
}
