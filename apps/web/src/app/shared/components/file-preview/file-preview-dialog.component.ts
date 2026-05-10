import { Component, Inject, OnDestroy, OnInit, inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { finalize } from 'rxjs';

import { ApplicationDocumentResponse } from '../../../core/interfaces/document.interface';
import { DocumentsService } from '../../../core/services/documents.service';
import { NotifyService } from '../../../core/services/notify.service';
import { FilePreviewComponent } from './file-preview.component';

export interface FilePreviewDialogData {
  document: ApplicationDocumentResponse;
  slotLabel: (slot: string) => string;
}

@Component({
  selector: 'app-file-preview-dialog',
  standalone: true,
  imports: [FilePreviewComponent, MatDialogModule],
  template: `
    <app-file-preview
      [document]="data.document"
      [previewResourceUrl]="previewResourceUrl"
      [previewImageUrl]="previewImageUrl"
      [previewMimeType]="previewMimeType"
      [isPreviewLoading]="isPreviewLoading"
      [previewError]="previewError"
      [slotLabel]="data.slotLabel"
      (downloadClick)="downloadDocument($event)"
    ></app-file-preview>
  `,
})
export class FilePreviewDialogComponent implements OnInit, OnDestroy {
  private readonly documentsService = inject(DocumentsService);
  private readonly sanitizer = inject(DomSanitizer);
  private readonly notify = inject(NotifyService);
  private objectUrl: string | null = null;

  previewResourceUrl: SafeResourceUrl | null = null;
  previewImageUrl: string | null = null;
  previewMimeType = '';
  isPreviewLoading = true;
  previewError = false;

  constructor(@Inject(MAT_DIALOG_DATA) readonly data: FilePreviewDialogData) {}

  ngOnInit(): void {
    this.documentsService
      .download(this.data.document.id)
      .pipe(finalize(() => (this.isPreviewLoading = false)))
      .subscribe({
        next: (blob) => this.preparePreview(blob),
        error: () => (this.previewError = true),
      });
  }

  ngOnDestroy(): void {
    this.clearObjectUrl();
  }

  downloadDocument(document: ApplicationDocumentResponse): void {
    this.documentsService.download(document.id).subscribe({
      next: (blob) => {
        const url = URL.createObjectURL(blob);
        const anchor = globalThis.document.createElement('a');
        anchor.href = url;
        anchor.download = document.originalFilename;
        anchor.click();
        URL.revokeObjectURL(url);
      },
      error: () => this.notify.error('Download failed.'),
    });
  }

  private preparePreview(blob: Blob): void {
    this.clearObjectUrl();
    this.objectUrl = URL.createObjectURL(blob);
    this.previewMimeType = blob.type || this.data.document.mimeType;

    if (this.previewMimeType.startsWith('image/')) {
      this.previewImageUrl = this.objectUrl;
      return;
    }

    if (this.previewMimeType === 'application/pdf') {
      this.previewResourceUrl = this.sanitizer.bypassSecurityTrustResourceUrl(this.objectUrl);
    }
  }

  private clearObjectUrl(): void {
    if (this.objectUrl !== null) {
      URL.revokeObjectURL(this.objectUrl);
    }

    this.objectUrl = null;
    this.previewImageUrl = null;
    this.previewResourceUrl = null;
  }
}
