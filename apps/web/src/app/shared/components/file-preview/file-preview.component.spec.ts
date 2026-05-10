import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';

import { ApplicationDocumentResponse } from '../../../core/interfaces/document.interface';
import { FilePreviewComponent } from './file-preview.component';

const documentRow: ApplicationDocumentResponse = {
  id: 'document-1',
  applicationId: 'application-1',
  slot: 'BUSINESS_PLAN',
  version: 2,
  originalFilename: 'business-plan.pdf',
  mimeType: 'application/pdf',
  sizeBytes: 2048,
  createdAt: '2026-05-10T08:00:00.000Z',
};

describe(FilePreviewComponent.name, () => {
  let fixture: ComponentFixture<FilePreviewComponent>;
  let component: FilePreviewComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FilePreviewComponent, NoopAnimationsModule],
    }).compileComponents();

    fixture = TestBed.createComponent(FilePreviewComponent);
    component = fixture.componentInstance;
  });

  it('emits document downloads from the preview toolbar', () => {
    component.document = documentRow;
    spyOn(component.downloadClick, 'emit');
    fixture.detectChanges();

    fixture.nativeElement.querySelector('button').click();

    expect(component.downloadClick.emit).toHaveBeenCalledWith(documentRow);
  });

  it('detects preview families and formats file sizes', () => {
    component.previewMimeType = 'image/png';

    expect(component.slotLabel('OTHER')).toBe('OTHER');
    expect(component.isImagePreview()).toBeTrue();
    expect(component.isPdfPreview()).toBeFalse();
    expect(component.formattedSize(512)).toBe('512 B');
    expect(component.formattedSize(2048)).toBe('2.0 KB');

    component.previewMimeType = 'application/pdf';

    expect(component.isPdfPreview()).toBeTrue();
    expect(component.formattedSize(3 * 1024 * 1024)).toBe('3.0 MB');
  });
});
