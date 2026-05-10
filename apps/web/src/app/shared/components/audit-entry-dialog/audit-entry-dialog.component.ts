import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';

import { AuditEntryDialogData } from '../../../core/interfaces/audit-entry-dialog.interface';
import { formatDateTime } from '../../../core/utils/application-view.mapper';
import {
  auditPayloadSummary,
  formatAuditAction,
  formatAuditActor,
  formatAuditTransition,
  shortAuditHash,
} from '../../../core/utils/audit-view.mapper';
import { ButtonComponent } from '../button/button.component';

@Component({
  selector: 'app-audit-entry-dialog',
  standalone: true,
  imports: [ButtonComponent, MatDialogModule, MatIconModule],
  templateUrl: './audit-entry-dialog.component.html',
  styleUrl: './audit-entry-dialog.component.scss',
})
export class AuditEntryDialogComponent {
  constructor(
    private readonly dialogRef: MatDialogRef<AuditEntryDialogComponent>,
    @Inject(MAT_DIALOG_DATA) private readonly data: AuditEntryDialogData,
  ) {}

  get entry() {
    return this.data.entry;
  }

  close(): void {
    this.dialogRef.close();
  }

  actionLabel(): string {
    return formatAuditAction(this.entry.action);
  }

  actorLabel(): string {
    return formatAuditActor(this.entry);
  }

  transitionLabel(): string {
    return formatAuditTransition(this.entry);
  }

  occurredAtLabel(): string {
    return formatDateTime(this.entry.occurredAt);
  }

  payloadSummary(): string {
    return auditPayloadSummary(this.entry.payload);
  }

  previousHashLabel(): string {
    return shortAuditHash(this.entry.previousHash);
  }

  payloadText(): string {
    return JSON.stringify(this.entry.payload ?? {}, null, 2);
  }
}
