import { Component, EventEmitter, Input, Output } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { SafeResourceUrl } from '@angular/platform-browser';

import { ApplicationDocumentResponse } from '../../../core/interfaces/document.interface';
import { ButtonComponent } from '../button/button.component';
import { EmptyStateComponent } from '../empty-state/empty-state.component';
import { LoadingStateComponent } from '../loading-state/loading-state.component';

@Component({
  selector: 'app-file-preview',
  standalone: true,
  imports: [
    ButtonComponent,
    EmptyStateComponent,
    LoadingStateComponent,
    MatIconModule,
  ],
  templateUrl: './file-preview.component.html',
  styleUrl: './file-preview.component.scss',
  host: { class: 'file-preview-container' },
})
export class FilePreviewComponent {
  @Input() document: ApplicationDocumentResponse | null = null;
  @Input() previewResourceUrl: SafeResourceUrl | null = null;
  @Input() previewImageUrl: string | null = null;
  @Input() previewMimeType = '';
  @Input() isPreviewLoading = false;
  @Input() previewError = false;
  @Input() slotLabel: (slot: string) => string = (slot) => slot;

  @Output() downloadClick = new EventEmitter<ApplicationDocumentResponse>();

  isImagePreview(): boolean {
    return this.previewMimeType.startsWith('image/');
  }

  isPdfPreview(): boolean {
    return this.previewMimeType === 'application/pdf';
  }

  formattedSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }
}
