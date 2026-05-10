import { Component, ElementRef, OnInit, ViewChild, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatTabsModule } from '@angular/material/tabs';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Observable, finalize } from 'rxjs';

import { ApplicationDecision } from '../../../core/enums/application-decision.enum';
import { ApplicationState } from '../../../core/enums/application-state.enum';
import { BANK_CATEGORY_LABELS, BankCategory } from '../../../core/enums/bank-category.enum';
import { ComplianceCheckStatus } from '../../../core/enums/compliance-check-status.enum';
import { DOCUMENT_SLOT_LABELS, DocumentSlot } from '../../../core/enums/document-slot.enum';
import { UserRole } from '../../../core/enums/user-role.enum';
import { ApplicationResponse } from '../../../core/interfaces/application.interface';
import { ApplicationAuditResponse } from '../../../core/interfaces/audit.interface';
import {
  ComplianceChecklistItem,
  ComplianceChecklistResponse,
} from '../../../core/interfaces/compliance-checklist.interface';
import { ApplicationDocumentResponse } from '../../../core/interfaces/document.interface';
import { FieldConfig, FormSelectData } from '../../../core/interfaces/form.interface';
import { TableActionEvent, TablePageEvent } from '../../../core/interfaces/table.interface';
import { UserResponse } from '../../../core/interfaces/user.interface';
import { auditTableConfig } from '../../../core/providers/tables/audit-table.config';
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
  canResubmitApplication,
  canSubmitApplication,
  canWithdrawApplication,
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
import { roleHome } from '../../../core/utils/role-home';
import { ButtonComponent } from '../../../shared/components/button/button.component';
import { ConfirmDialogComponent } from '../../../shared/components/confirm-dialog/confirm-dialog.component';
import { ErrorStateComponent } from '../../../shared/components/error-state/error-state.component';
import { AuditEntryDialogComponent } from '../../../shared/components/audit-entry-dialog/audit-entry-dialog.component';
import { FilePreviewDialogComponent } from '../../../shared/components/file-preview/file-preview-dialog.component';
import { InputsComponent } from '../../../shared/components/inputs/inputs.component';
import { LoadingStateComponent } from '../../../shared/components/loading-state/loading-state.component';
import { StatusBadgeComponent } from '../../../shared/components/status-badge/status-badge.component';
import { TableComponent } from '../../../shared/components/table/table.component';

@Component({
  selector: 'app-application-detail',
  standalone: true,
  imports: [
    ButtonComponent,
    ErrorStateComponent,
    InputsComponent,
    MatButtonModule,
    LoadingStateComponent,
    MatIconModule,
    MatTabsModule,
    MatTooltipModule,
    ReactiveFormsModule,
    RouterLink,
    StatusBadgeComponent,
    TableComponent,
  ],
  templateUrl: './application-detail.component.html',
  styleUrl: './application-detail.component.scss',
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
  readonly ComplianceCheckStatus = ComplianceCheckStatus;
  readonly bankCategoryLabels = BANK_CATEGORY_LABELS;
  readonly DocumentSlot = DocumentSlot;
  readonly documentSlotLabels = DOCUMENT_SLOT_LABELS;
  readonly documentSlots = Object.values(DocumentSlot);
  readonly documentSlotLabel = (slot: string): string => this.slotLabel(slot);
  readonly user = this.auth.currentUser;
  readonly auditTableConfig = auditTableConfig;
  readonly reviewJustificationField: FieldConfig = {
    name: 'justification',
    type: 'textarea',
    label: 'Justification',
    placeholder: 'Record a clear, evidence-based reason for this action.',
    rows: 6,
  };
  readonly assignReviewerField: FieldConfig = {
    name: 'reviewerId',
    type: 'select',
    label: 'Reviewer',
    selectData: 'reviewers',
  };
  readonly documentSlotField: FieldConfig = {
    name: 'slot',
    type: 'select',
    label: 'Document type',
    selectData: 'documentSlots',
  };
  readonly reviewForm = this.fb.nonNullable.group({
    justification: ['', [Validators.required, Validators.minLength(8)]],
  });
  readonly assignForm = this.fb.nonNullable.group({
    reviewerId: ['', [Validators.required]],
  });
  readonly uploadForm = this.fb.nonNullable.group({
    slot: [''],
  });

  application: ApplicationResponse | null = null;
  compliance: ComplianceChecklistResponse | null = null;
  audit: ApplicationAuditResponse[] = [];
  auditLoading = false;
  auditTotalRecords = 0;
  auditTotalPages = 0;
  auditPage = 0;
  reviewers: UserResponse[] = [];
  documents: ApplicationDocumentResponse[] = [];
  selectedSlot: DocumentSlot | '' = '';
  selectedTabIndex = 0;
  uploadLoading = false;
  complianceLoading = false;
  complianceError = false;
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
    this.application = null;
    this.compliance = null;
    this.audit = [];
    this.documents = [];

    this.applicationsService
      .get(id)
      .pipe(finalize(() => (this.isLoading = false)))
      .subscribe({
        next: (application) => {
          this.application = application;
          this.loadCompliance(application.id);
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

  bankCategoryLabel(category: BankCategory): string {
    return this.bankCategoryLabels[category] ?? category;
  }

  formattedRwf(value: string): string {
    return new Intl.NumberFormat('en-RW', {
      maximumFractionDigits: 0,
      style: 'currency',
      currency: 'RWF',
    }).format(Number(value));
  }

  backLink(): string {
    const role = this.user()?.role;
    return role === undefined ? '/' : roleHome(role);
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

  reviewerSelectData(): FormSelectData {
    return {
      reviewers: this.reviewers.map((reviewer) => ({
        label: reviewer.fullName,
        value: reviewer.id,
      })),
    };
  }

  documentSlotSelectData(): FormSelectData {
    return {
      documentSlots: this.documentSlots.map((slot) => ({
        label: this.slotLabel(slot),
        value: slot,
      })),
    };
  }

  evidenceLabel(item: ComplianceChecklistItem): string {
    if (item.evidence.length === 0) {
      return 'No evidence uploaded.';
    }

    return item.evidence
      .map((evidence) => {
        const versions = evidence.versions.map((version) => `v${version}`).join(', ');
        return `${this.slotLabel(evidence.slot)} ${versions}`;
      })
      .join('; ');
  }

  requiredEvidenceLabel(item: ComplianceChecklistItem): string {
    if (item.requiredSlots.length === 0) {
      return 'No file upload required.';
    }

    return item.requiredSlots.map((slot) => this.slotLabel(slot)).join(', ');
  }

  blockingComplianceItems(): ComplianceChecklistItem[] {
    return this.checklistItems().filter(
      (item) => item.blocking && item.status !== ComplianceCheckStatus.Complete,
    );
  }

  requiredComplianceItems(): ComplianceChecklistItem[] {
    return this.checklistItems().filter((item) => item.blocking);
  }

  uploadableRequirements(): ComplianceChecklistItem[] {
    return this.requiredComplianceItems().filter((item) => item.requiredSlots.length > 0);
  }

  documentForRequirement(item: ComplianceChecklistItem): ApplicationDocumentResponse | null {
    return (
      this.documents.find((document) =>
        item.requiredSlots.includes(document.slot as DocumentSlot),
      ) ?? null
    );
  }

  missingDocumentCount(): number {
    return this.uploadableRequirements().filter(
      (item) => item.status !== ComplianceCheckStatus.Complete,
    ).length;
  }

  uploadedRequiredDocumentCount(): number {
    return this.uploadableRequirements().filter(
      (item) => item.status === ComplianceCheckStatus.Complete,
    ).length;
  }

  readinessPercent(): number {
    const requirements = this.uploadableRequirements();

    if (requirements.length === 0) {
      return 100;
    }

    return Math.round((this.uploadedRequiredDocumentCount() / requirements.length) * 100);
  }

  selectRequirementSlot(item: ComplianceChecklistItem): void {
    if (item.requiredSlots.length === 0) {
      return;
    }

    this.selectedSlot = item.requiredSlots[0];
    this.uploadForm.controls.slot.setValue(item.requiredSlots[0]);
  }

  complianceProgressLabel(): string {
    if (this.compliance === null) {
      return 'No checklist loaded.';
    }

    const summary = this.compliance.summary;
    return `${summary.complete} complete · ${summary.missing} missing · ${summary.reviewRequired} needs review`;
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

  canSubmit(): boolean {
    return this.application !== null && canSubmitApplication(this.user(), this.application);
  }

  canWithdraw(): boolean {
    return this.application !== null && canWithdrawApplication(this.user(), this.application);
  }

  canResubmit(): boolean {
    return this.application !== null && canResubmitApplication(this.user(), this.application);
  }

  openFilePicker(): void {
    const slot = this.selectedDocumentSlot();

    if (slot === '') {
      this.notify.warning('Select a document slot before uploading.');
      return;
    }

    this.selectedSlot = slot;
    this.fileInput.nativeElement.value = '';
    this.fileInput.nativeElement.click();
  }

  selectSlot(slot: string): void {
    this.selectedSlot = slot as DocumentSlot;
    this.uploadForm.controls.slot.setValue(slot);
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    const slot = this.selectedDocumentSlot();

    if (file === undefined || this.application === null || slot === '') {
      return;
    }

    this.uploadLoading = true;
    this.documentsService
      .upload(this.application.id, slot, file)
      .pipe(finalize(() => (this.uploadLoading = false)))
      .subscribe({
        next: () => {
          this.notify.success('Document uploaded.');
          this.selectedTabIndex = 1;
          this.loadDocuments(this.application!.id);
          this.loadCompliance(this.application!.id);
        },
        error: () => this.notify.error('Upload failed. Check file type and size (max 5 MB).'),
      });
  }

  previewDocument(document: ApplicationDocumentResponse): void {
    this.dialog.open(FilePreviewDialogComponent, {
      width: '1080px',
      maxWidth: '96vw',
      maxHeight: '94vh',
      data: {
        document,
        slotLabel: this.documentSlotLabel,
      },
    });
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

  submit(): void {
    if (this.application === null) {
      return;
    }

    if (!this.hasRequiredEvidence()) {
      this.showComplianceGapsDialog();
      return;
    }

    this.runAction(this.applicationsService.submit(this.application.id), 'Application submitted.');
  }

  withdraw(): void {
    if (this.application === null) {
      return;
    }

    this.dialog
      .open<ConfirmDialogComponent, unknown, boolean>(ConfirmDialogComponent, {
        width: '460px',
        data: {
          title: 'Withdraw application?',
          message: `This closes ${this.application.referenceNumber} and records the action permanently.`,
          confirmLabel: 'Withdraw',
          variant: 'danger',
        },
      })
      .afterClosed()
      .subscribe((confirmed) => {
        if (confirmed && this.application !== null) {
          this.runAction(
            this.applicationsService.withdraw(this.application.id),
            'Application withdrawn.',
          );
        }
      });
  }

  resubmit(): void {
    if (this.application === null) {
      return;
    }

    if (!this.hasRequiredEvidence()) {
      this.showComplianceGapsDialog();
      return;
    }

    this.runAction(
      this.applicationsService.resubmit(this.application.id),
      'Application resubmitted.',
    );
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

  handleAuditAction(event: TableActionEvent<ApplicationAuditResponse>): void {
    if (event.actionId === 'view') {
      this.openAuditEntry(event.row);
    }
  }

  handleAuditPage(event: TablePageEvent): void {
    this.auditPage = Math.max((event.pageNumber || 1) - 1, 0);
    if (this.application !== null) {
      this.loadAudit(this.application.id, this.auditPage);
    }
  }

  openAuditEntry(entry: ApplicationAuditResponse): void {
    this.dialog.open(AuditEntryDialogComponent, {
      width: '760px',
      maxWidth: '95vw',
      maxHeight: '94vh',
      data: { entry },
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
      error: (err) => {
        if (err.status === 409 && err.error?.error?.code === 'CONFLICT') {
          this.showComplianceGapsDialog();
        } else {
          this.notify.error('Unable to complete the action.');
        }
      },
    });
  }

  private showComplianceGapsDialog(): void {
    if (this.compliance === null) {
      this.notify.error('Regulatory checklist has blocking gaps. Complete required evidence before submission.');
      return;
    }

    const blockingItems = this.compliance.sections.flatMap((section) =>
      section.items
        .filter((item) => item.blocking && item.status !== ComplianceCheckStatus.Complete)
        .map((item) => ({
          section: section.title,
          item: item.title,
          requiredEvidence: this.requiredEvidenceLabel(item),
        })),
    );

    let message = 'Complete required evidence before submission.';
    if (blockingItems.length > 0) {
      message = `Required evidence is missing:\n\n${blockingItems
        .map((b) => `- ${b.item}: ${b.requiredEvidence}`)
        .join('\n')}`;
    }

    this.selectedTabIndex = 1;
    this.dialog
      .open<ConfirmDialogComponent, unknown, boolean>(ConfirmDialogComponent, {
        width: '520px',
        data: {
          title: 'Incomplete compliance checklist',
          message: message,
          confirmLabel: 'Review evidence',
          variant: 'primary',
        },
      })
      .afterClosed()
      .subscribe((confirmed) => {
        if (confirmed) {
          this.selectedTabIndex = 1;
          this.loadCompliance(this.application!.id);
        }
      });
  }

  private loadAudit(applicationId: string, page = 0): void {
    this.auditLoading = true;
    this.auditService
      .list(applicationId, { page, size: 20 })
      .pipe(finalize(() => (this.auditLoading = false)))
      .subscribe({
        next: (response) => {
          const pageResponse = normalizePagedResponse(response);
          this.audit = pageResponse.records;
          this.auditTotalRecords = pageResponse.totalRecords;
          this.auditTotalPages = pageResponse.totalPages;
        },
        error: () => {
          this.audit = [];
          this.auditTotalRecords = 0;
          this.auditTotalPages = 0;
        },
      });
  }

  loadCompliance(applicationId: string): void {
    this.complianceLoading = true;
    this.complianceError = false;
    this.applicationsService
      .compliance(applicationId)
      .pipe(finalize(() => (this.complianceLoading = false)))
      .subscribe({
        next: (checklist) => (this.compliance = checklist),
        error: () => {
          this.compliance = null;
          this.complianceError = true;
        },
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

  private checklistItems(): ComplianceChecklistItem[] {
    return this.compliance?.sections.flatMap((section) => section.items) ?? [];
  }

  private hasRequiredEvidence(): boolean {
    if (this.compliance === null) {
      return true;
    }

    return this.blockingComplianceItems().length === 0;
  }

  private selectedDocumentSlot(): DocumentSlot | '' {
    return (this.uploadForm.controls.slot.value as DocumentSlot | '') || this.selectedSlot;
  }
}
