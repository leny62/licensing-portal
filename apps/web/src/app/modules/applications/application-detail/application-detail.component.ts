import { Component, ElementRef, OnInit, ViewChild, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { Observable, finalize } from 'rxjs';

import { ApplicationDecision } from '../../../core/enums/application-decision.enum';
import { ApplicationState } from '../../../core/enums/application-state.enum';
import { DOCUMENT_SLOT_LABELS, DocumentSlot } from '../../../core/enums/document-slot.enum';
import { UserRole } from '../../../core/enums/user-role.enum';
import { ApplicationResponse } from '../../../core/interfaces/application.interface';
import { ApplicationAuditResponse } from '../../../core/interfaces/audit.interface';
import { ApplicationDocumentResponse } from '../../../core/interfaces/document.interface';
import { UserResponse } from '../../../core/interfaces/user.interface';
import { ApplicationsService } from '../../../core/services/applications.service';
import { AuditService } from '../../../core/services/audit.service';
import { AuthService } from '../../../core/services/auth.service';
import { DocumentsService } from '../../../core/services/documents.service';
import { NotifyService } from '../../../core/services/notify.service';
import { UsersService } from '../../../core/services/users.service';
import {
  canClaimApplication,
  canDecideApplication,
  canReviewApplication,
  formatDateTime,
} from '../../../core/utils/application-view.mapper';
import { normalizePagedResponse } from '../../../core/utils/api-list-normalizer';
import {
  auditPayloadSummary,
  formatAuditAction,
  formatAuditActor,
  formatAuditTransition,
  shortAuditHash,
} from '../../../core/utils/audit-view.mapper';
import { ButtonComponent } from '../../../shared/components/button/button.component';
import { ConfirmDialogComponent } from '../../../shared/components/confirm-dialog/confirm-dialog.component';
import { ErrorStateComponent } from '../../../shared/components/error-state/error-state.component';
import { LoadingStateComponent } from '../../../shared/components/loading-state/loading-state.component';
import { StatusBadgeComponent } from '../../../shared/components/status-badge/status-badge.component';

@Component({
  selector: 'app-application-detail',
  standalone: true,
  imports: [
    ButtonComponent,
    ErrorStateComponent,
    LoadingStateComponent,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatSelectModule,
    ReactiveFormsModule,
    StatusBadgeComponent,
  ],
  templateUrl: './application-detail.component.html',
})
export class ApplicationDetailComponent implements OnInit {
  @ViewChild('fileInput') private readonly fileInput!: ElementRef<HTMLInputElement>;

  private readonly route = inject(ActivatedRoute);
  private readonly applicationsService = inject(ApplicationsService);
  private readonly auditService = inject(AuditService);
  private readonly usersService = inject(UsersService);
  private readonly documentsService = inject(DocumentsService);
  private readonly auth = inject(AuthService);
  private readonly fb = inject(FormBuilder);
  private readonly dialog = inject(MatDialog);
  private readonly notify = inject(NotifyService);

  readonly UserRole = UserRole;
  readonly ApplicationState = ApplicationState;
  readonly ApplicationDecision = ApplicationDecision;
  readonly DocumentSlot = DocumentSlot;
  readonly documentSlotLabels = DOCUMENT_SLOT_LABELS;
  readonly documentSlots = Object.values(DocumentSlot);
  readonly user = this.auth.currentUser;
  readonly reviewForm = this.fb.nonNullable.group({
    justification: ['', [Validators.required, Validators.minLength(8)]],
  });
  readonly assignForm = this.fb.nonNullable.group({
    reviewerId: ['', [Validators.required]],
  });

  application: ApplicationResponse | null = null;
  audit: ApplicationAuditResponse[] = [];
  reviewers: UserResponse[] = [];
  documents: ApplicationDocumentResponse[] = [];
  selectedSlot: DocumentSlot | '' = '';
  uploadLoading = false;
  isLoading = true;
  hasError = false;
  actionLoading = false;

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    const id = this.route.snapshot.paramMap.get('id');

    if (id === null) {
      this.hasError = true;
      this.isLoading = false;
      return;
    }

    this.isLoading = true;
    this.hasError = false;

    this.applicationsService
      .get(id)
      .pipe(finalize(() => (this.isLoading = false)))
      .subscribe({
        next: (application) => {
          this.application = application;
          this.loadAudit(application.id);
          this.loadDocuments(application.id);
          this.loadReviewersIfNeeded();
        },
        error: () => (this.hasError = true),
      });
  }

  formatted(value: string | null): string {
    return formatDateTime(value);
  }

  formattedSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  slotLabel(slot: string): string {
    return this.documentSlotLabels[slot as DocumentSlot] ?? slot;
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

  canVerifyAudit(): boolean {
    const role = this.user()?.role;
    return role === UserRole.Admin || role === UserRole.Approver;
  }

  canUpload(): boolean {
    return (
      this.user()?.role === UserRole.Applicant &&
      this.application !== null &&
      (this.application.state === ApplicationState.Draft ||
        this.application.state === ApplicationState.ChangesRequested)
    );
  }

  openFilePicker(): void {
    if (this.selectedSlot === '') {
      this.notify.warning('Select a document slot before uploading.');
      return;
    }
    this.fileInput.nativeElement.value = '';
    this.fileInput.nativeElement.click();
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];

    if (file === undefined || this.application === null || this.selectedSlot === '') {
      return;
    }

    this.uploadLoading = true;
    this.documentsService
      .upload(this.application.id, this.selectedSlot, file)
      .pipe(finalize(() => (this.uploadLoading = false)))
      .subscribe({
        next: () => {
          this.notify.success('Document uploaded.');
          this.loadDocuments(this.application!.id);
        },
        error: () => this.notify.error('Upload failed. Check file type and size (max 5 MB).'),
      });
  }

  downloadDocument(documentId: string, filename: string): void {
    this.documentsService.download(documentId).subscribe({
      next: (blob) => {
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement('a');
        anchor.href = url;
        anchor.download = filename;
        anchor.click();
        URL.revokeObjectURL(url);
      },
      error: () => this.notify.error('Download failed.'),
    });
  }

  canClaim(): boolean {
    return this.application !== null && canClaimApplication(this.user(), this.application);
  }

  canReview(): boolean {
    return this.application !== null && canReviewApplication(this.user(), this.application);
  }

  canDecide(): boolean {
    return this.application !== null && canDecideApplication(this.user(), this.application);
  }

  claim(): void {
    if (this.application === null) {
      return;
    }

    this.runAction(this.applicationsService.claim(this.application.id), 'Application claimed.');
  }

  requestInfo(): void {
    if (this.application === null || this.reviewForm.invalid) {
      this.reviewForm.markAllAsTouched();
      return;
    }

    this.runAction(
      this.applicationsService.requestInfo(
        this.application.id,
        this.reviewForm.controls.justification.value,
      ),
      'Information requested.',
    );
  }

  recommend(decision: ApplicationDecision): void {
    if (this.application === null || this.reviewForm.invalid) {
      this.reviewForm.markAllAsTouched();
      return;
    }

    this.runAction(
      this.applicationsService.recommend(
        this.application.id,
        decision,
        this.reviewForm.controls.justification.value,
      ),
      'Recommendation submitted.',
    );
  }

  decide(decision: ApplicationDecision): void {
    if (this.application === null || this.reviewForm.invalid) {
      this.reviewForm.markAllAsTouched();
      return;
    }

    this.dialog
      .open<ConfirmDialogComponent, unknown, boolean>(ConfirmDialogComponent, {
        width: '460px',
        data: {
          title:
            decision === ApplicationDecision.Approve
              ? 'Approve application?'
              : 'Reject application?',
          message: `This records a final decision for ${this.application.referenceNumber}.`,
          confirmLabel: decision === ApplicationDecision.Approve ? 'Approve' : 'Reject',
          variant: decision === ApplicationDecision.Approve ? 'success' : 'danger',
        },
      })
      .afterClosed()
      .subscribe((confirmed) => {
        if (confirmed && this.application !== null) {
          this.runAction(
            this.applicationsService.decide(
              this.application.id,
              decision,
              this.reviewForm.controls.justification.value,
            ),
            'Decision recorded.',
          );
        }
      });
  }

  assign(): void {
    if (this.application === null || this.assignForm.invalid) {
      this.assignForm.markAllAsTouched();
      return;
    }

    this.runAction(
      this.applicationsService.assign(
        this.application.id,
        this.assignForm.controls.reviewerId.value,
      ),
      'Reviewer assigned.',
    );
  }

  verifyAudit(): void {
    if (this.application === null) {
      return;
    }

    this.auditService.verify(this.application.id).subscribe((result) => {
      this.notify[result.valid ? 'success' : 'warning'](
        result.valid
          ? `Audit chain verified across ${result.checkedEntries} entries.`
          : (result.reason ?? 'Audit chain verification failed.'),
      );
    });
  }

  private runAction(request: Observable<ApplicationResponse>, successMessage: string): void {
    this.actionLoading = true;
    request.pipe(finalize(() => (this.actionLoading = false))).subscribe({
      next: () => {
        this.notify.success(successMessage);
        this.reviewForm.reset();
        this.load();
      },
      error: () => this.notify.error('Unable to complete the action.'),
    });
  }

  private loadAudit(applicationId: string): void {
    this.auditService.list(applicationId, { page: 0, size: 20 }).subscribe({
      next: (response) => (this.audit = normalizePagedResponse(response).records),
      error: () => (this.audit = []),
    });
  }

  private loadDocuments(applicationId: string): void {
    this.documentsService.list(applicationId).subscribe({
      next: (docs) => (this.documents = docs),
      error: () => (this.documents = []),
    });
  }

  private loadReviewersIfNeeded(): void {
    if (this.user()?.role !== UserRole.Admin) {
      return;
    }

    this.usersService.list({ role: UserRole.Reviewer }).subscribe({
      next: (response) =>
        (this.reviewers = normalizePagedResponse(response).records.filter((r) => r.isActive)),
      error: () => (this.reviewers = []),
    });
  }
}
