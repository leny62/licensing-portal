import { TitleCasePipe } from '@angular/common';
import { Component, ElementRef, OnInit, ViewChild, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatTabsModule } from '@angular/material/tabs';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Observable, finalize, forkJoin, switchMap } from 'rxjs';

import { ApplicationDecision } from '../../../core/enums/application-decision.enum';
import { ApplicationState } from '../../../core/enums/application-state.enum';
import { BANK_CATEGORY_LABELS, BankCategory } from '../../../core/enums/bank-category.enum';
import { ComplianceCheckStatus } from '../../../core/enums/compliance-check-status.enum';
import {
  ComplianceFindingSeverity,
  ComplianceFindingStatus,
  FeeStatus,
  FitAndProperStatus,
} from '../../../core/enums/regulatory-status.enum';
import { DOCUMENT_SLOT_LABELS, DocumentSlot } from '../../../core/enums/document-slot.enum';
import { SeniorManagerRole } from '../../../core/enums/senior-manager-role.enum';
import { ShareholderType } from '../../../core/enums/shareholder-type.enum';
import { UserRole } from '../../../core/enums/user-role.enum';
import { ApplicationResponse } from '../../../core/interfaces/application.interface';
import { ApplicationAuditResponse } from '../../../core/interfaces/audit.interface';
import {
  ComplianceChecklistItem,
  ComplianceChecklistResponse,
} from '../../../core/interfaces/compliance-checklist.interface';
import { ApplicationDocumentResponse } from '../../../core/interfaces/document.interface';
import { FieldConfig, FormSelectData } from '../../../core/interfaces/form.interface';
import {
  ApplicationDecisionRecordResponse,
  ApplicationFeeResponse,
  ApplicationSlaClockResponse,
  CapitalDeclarationResponse,
  ComplianceFindingRecordResponse,
  DocumentSlotSpecResponse,
  InformationLetterResponse,
  MarkShareholderFitAndProperRequest,
  SaveSeniorManagerRequest,
  SaveSignificantShareholderRequest,
  SeniorManagerResponse,
  SignificantShareholderResponse,
} from '../../../core/interfaces/regulatory.interface';
import { TableActionEvent, TablePageEvent } from '../../../core/interfaces/table.interface';
import { UserResponse } from '../../../core/interfaces/user.interface';
import {
  capitalDeclarationFields,
  informationLetterFields,
  seniorManagerFields,
  seniorManagerRoleOptions,
  shareholderFields,
  shareholderTypeOptions,
} from '../../../core/providers/forms/regulatory-form.config';
import { auditTableConfig } from '../../../core/providers/tables/audit-table.config';
import {
  complianceFindingsTableConfig,
  decisionsTableConfig,
  documentSlotSpecsTableConfig,
  informationLettersTableConfig,
  seniorManagersReadonlyTableConfig,
  seniorManagersTableConfig,
  shareholdersReadonlyTableConfig,
  shareholdersReviewerTableConfig,
  shareholdersTableConfig,
  slaClocksTableConfig,
} from '../../../core/providers/tables/regulatory-table.config';
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
import {
  formatPercent,
  formatRwf,
  seniorManagerRoleLabel,
} from '../../../core/utils/regulatory-view.mapper';
import { roleHome } from '../../../core/utils/role-home';
import { ButtonComponent } from '../../../shared/components/button/button.component';
import { ConfirmDialogComponent } from '../../../shared/components/confirm-dialog/confirm-dialog.component';
import {
  DecisionDialogComponent,
  DecisionDialogResult,
} from '../../../shared/components/decision-dialog/decision-dialog.component';
import { ErrorStateComponent } from '../../../shared/components/error-state/error-state.component';
import { AuditEntryDialogComponent } from '../../../shared/components/audit-entry-dialog/audit-entry-dialog.component';
import { FilePreviewDialogComponent } from '../../../shared/components/file-preview/file-preview-dialog.component';
import {
  FitProperDialogComponent,
  FitProperDialogResult,
} from '../../../shared/components/fit-proper-dialog/fit-proper-dialog.component';
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
    TitleCasePipe,
  ],
  templateUrl: './application-detail.component.html',
  styleUrl: './application-detail.component.scss',
})
export class ApplicationDetailComponent implements OnInit {
  @ViewChild('fileInput') private readonly fileInput!: ElementRef<HTMLInputElement>;
  @ViewChild('feeProofInput') private readonly feeProofInput!: ElementRef<HTMLInputElement>;

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
  readonly FeeStatus = FeeStatus;
  readonly FitAndProperStatus = FitAndProperStatus;
  readonly bankCategoryLabels = BANK_CATEGORY_LABELS;
  readonly DocumentSlot = DocumentSlot;
  readonly SeniorManagerRole = SeniorManagerRole;
  readonly ShareholderType = ShareholderType;
  readonly documentSlotLabels = DOCUMENT_SLOT_LABELS;
  readonly documentSlots = Object.values(DocumentSlot);
  readonly documentSlotLabel = (slot: string): string => this.slotLabel(slot);
  readonly user = this.auth.currentUser;
  readonly auditTableConfig = auditTableConfig;
  readonly complianceFindingsTableConfig = complianceFindingsTableConfig;
  readonly decisionsTableConfig = decisionsTableConfig;
  readonly documentSlotSpecsTableConfig = documentSlotSpecsTableConfig;
  readonly informationLettersTableConfig = informationLettersTableConfig;
  readonly slaClocksTableConfig = slaClocksTableConfig;
  readonly capitalDeclarationFields = capitalDeclarationFields;
  readonly shareholderFields = shareholderFields;
  readonly seniorManagerFields = seniorManagerFields;
  readonly informationLetterFields = informationLetterFields;
  readonly requiredManagerRoles = [
    SeniorManagerRole.ChiefExecutive,
    SeniorManagerRole.ChiefFinance,
    SeniorManagerRole.ChiefRisk,
    SeniorManagerRole.ChiefCompliance,
  ];
  readonly deficiencyFields: FieldConfig[] = [
    {
      name: 'entity',
      type: 'text',
      label: 'Entity / slot',
      placeholder: 'e.g. Capital declaration',
      validators: [Validators.required],
    },
    {
      name: 'reason',
      type: 'text',
      label: 'Reason',
      placeholder: 'Describe the deficiency',
      validators: [Validators.required],
    },
    {
      name: 'rectificationDeadline',
      type: 'date',
      label: 'Rectification deadline',
      validators: [Validators.required],
    },
  ];
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
  readonly capitalForm = this.fb.nonNullable.group({
    amountRwf: [0, [Validators.required, Validators.min(1)]],
    sourceSummary: ['', [Validators.required, Validators.minLength(12)]],
  });
  readonly shareholderForm = this.fb.nonNullable.group({
    shareholderType: [ShareholderType.NaturalPerson, [Validators.required]],
    fullName: ['', [Validators.required]],
    registrationNumber: [''],
    country: ['RW', [Validators.required]],
    ownershipPercent: [0, [Validators.required, Validators.min(0.01), Validators.max(100)]],
    sourceOfFunds: ['', [Validators.required, Validators.minLength(10)]],
    beneficialOwner: [''],
  });
  readonly seniorManagerForm = this.fb.nonNullable.group({
    role: [SeniorManagerRole.ChiefExecutive, [Validators.required]],
    fullName: ['', [Validators.required]],
    email: ['', [Validators.required, Validators.email]],
    nationality: ['RW', [Validators.required]],
    yearsExperience: [0, [Validators.required, Validators.min(0), Validators.max(80)]],
    fitAndProperAttested: [false],
  });
  readonly informationLetterForm = this.fb.nonNullable.group({
    letterType: ['COMPLETE', [Validators.required]],
    subject: ['', [Validators.required, Validators.minLength(6)]],
    responseDays: [10, [Validators.required, Validators.min(1), Validators.max(90)]],
    body: ['', [Validators.required, Validators.minLength(20)]],
  });
  readonly deficiencyForm = this.fb.nonNullable.group({
    entity: ['', [Validators.required]],
    reason: ['', [Validators.required]],
    rectificationDeadline: ['', [Validators.required]],
  });

  application: ApplicationResponse | null = null;
  compliance: ComplianceChecklistResponse | null = null;
  allChecklistItems: ComplianceChecklistItem[] = [];
  blockingComplianceItems: ComplianceChecklistItem[] = [];
  requiredComplianceItems: ComplianceChecklistItem[] = [];
  uploadableRequirements: ComplianceChecklistItem[] = [];
  missingDocuments = 0;
  uploadedRequiredDocuments = 0;
  readinessScore = 100;
  capitalDeclaration: CapitalDeclarationResponse | null = null;
  shareholders: SignificantShareholderResponse[] = [];
  seniorManagers: SeniorManagerResponse[] = [];
  documentSlotSpecs: DocumentSlotSpecResponse[] = [];
  complianceFindings: ComplianceFindingRecordResponse[] = [];
  decisions: ApplicationDecisionRecordResponse[] = [];
  informationLetters: InformationLetterResponse[] = [];
  fee: ApplicationFeeResponse | null = null;
  slaClocks: ApplicationSlaClockResponse[] = [];
  permittedActivities: string[] = [];
  audit: ApplicationAuditResponse[] = [];
  deficiencyRows: { entity: string; reason: string; rectificationDeadline: string }[] = [];
  lastIssuedLetter: InformationLetterResponse | null = null;
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
  regulatoryLoading = false;
  regulatoryError = false;
  regulatorySaving = false;
  feeProofLoading = false;
  editingShareholderId: string | null = null;
  editingSeniorManagerId: string | null = null;
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
    this.resetChecklistState();
    this.capitalDeclaration = null;
    this.shareholders = [];
    this.seniorManagers = [];
    this.documentSlotSpecs = [];
    this.complianceFindings = [];
    this.decisions = [];
    this.informationLetters = [];
    this.fee = null;
    this.slaClocks = [];
    this.permittedActivities = [];
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
          this.loadRegulatory(application.id);
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
    return formatRwf(value);
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

  regulatorySelectData(): FormSelectData {
    return {
      shareholderTypes: shareholderTypeOptions,
      seniorManagerRoles: seniorManagerRoleOptions,
    };
  }

  shareholdersConfig() {
    if (this.canEditRegulatory()) {
      return shareholdersTableConfig;
    }

    if (this.canMarkShareholderFitAndProper()) {
      return shareholdersReviewerTableConfig;
    }

    return shareholdersReadonlyTableConfig;
  }

  seniorManagersConfig() {
    return this.canEditRegulatory() ? seniorManagersTableConfig : seniorManagersReadonlyTableConfig;
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

  documentForRequirement(item: ComplianceChecklistItem): ApplicationDocumentResponse | null {
    return (
      this.documents.find((document) =>
        item.requiredSlots.includes(document.slot as DocumentSlot),
      ) ?? null
    );
  }

  missingDocumentCount(): number {
    return this.missingDocuments;
  }

  uploadedRequiredDocumentCount(): number {
    return this.uploadedRequiredDocuments;
  }

  readinessPercent(): number {
    return this.readinessScore;
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
        this.application.state === ApplicationState.AwaitingApplicantResponse)
    );
  }

  canEditRegulatory(): boolean {
    return this.canUpload();
  }

  canIssueInformationLetter(): boolean {
    const role = this.user()?.role;
    return role === UserRole.Reviewer || role === UserRole.Admin;
  }

  canMarkShareholderFitAndProper(): boolean {
    return (
      this.application !== null &&
      this.user()?.role === UserRole.Reviewer &&
      this.application.reviewerId === this.user()?.id &&
      this.application.state === ApplicationState.UnderReview
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
          this.refreshRegulatoryWorkflows();
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
      next: (blob) => this.downloadBlob(blob, document.originalFilename),
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

  openDecisionDialog(): void {
    if (this.application === null) {
      return;
    }

    this.dialog
      .open<DecisionDialogComponent, unknown, DecisionDialogResult | false>(
        DecisionDialogComponent,
        {
          width: '680px',
          maxWidth: '96vw',
          maxHeight: '94vh',
          data: {
            referenceNumber: this.application.referenceNumber,
            permittedActivities: this.permittedActivities,
          },
        },
      )
      .afterClosed()
      .subscribe((result) => {
        if (result && this.application !== null) {
          this.runAction(
            this.applicationsService.decide(this.application.id, {
              decision: result.decision,
              justification: result.justification,
              decisionType: result.decisionType,
              conditions: result.conditions,
              allowedActivities: result.allowedActivities,
              refusalReasons: result.refusalReasons,
            }),
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

  saveCapitalDeclaration(): void {
    if (this.application === null || this.capitalForm.invalid) {
      this.capitalForm.markAllAsTouched();
      return;
    }

    const value = this.capitalForm.getRawValue();
    this.regulatorySaving = true;
    this.applicationsService
      .saveCapitalDeclaration(this.application.id, {
        amountRwf: Number(value.amountRwf),
        sourceSummary: value.sourceSummary,
      })
      .pipe(finalize(() => (this.regulatorySaving = false)))
      .subscribe({
        next: () => {
          this.notify.success('Capital declaration saved.');
          this.refreshRegulatoryWorkflows();
        },
        error: () => this.notify.error('Capital declaration could not be saved.'),
      });
  }

  saveShareholder(): void {
    if (this.application === null || this.shareholderForm.invalid) {
      this.shareholderForm.markAllAsTouched();
      return;
    }

    const value = this.shareholderForm.getRawValue();
    const body: SaveSignificantShareholderRequest = {
      shareholderType: value.shareholderType,
      fullName: value.fullName,
      country: value.country,
      ownershipPercent: Number(value.ownershipPercent),
      sourceOfFunds: value.sourceOfFunds,
      registrationNumber: this.optionalText(value.registrationNumber),
      beneficialOwner: this.optionalText(value.beneficialOwner),
    };
    const request =
      this.editingShareholderId === null
        ? this.applicationsService.createShareholder(this.application.id, body)
        : this.applicationsService.updateShareholder(
            this.application.id,
            this.editingShareholderId,
            body,
          );

    this.regulatorySaving = true;
    request.pipe(finalize(() => (this.regulatorySaving = false))).subscribe({
      next: () => {
        this.notify.success(
          this.editingShareholderId === null ? 'Shareholder added.' : 'Shareholder updated.',
        );
        this.resetShareholderForm();
        this.refreshRegulatoryWorkflows();
      },
      error: () => this.notify.error('Shareholder record could not be saved.'),
    });
  }

  editShareholder(row: SignificantShareholderResponse): void {
    this.editingShareholderId = row.id;
    this.shareholderForm.patchValue({
      shareholderType: row.shareholderType,
      fullName: row.fullName,
      registrationNumber: row.registrationNumber ?? '',
      country: row.country,
      ownershipPercent: Number(row.ownershipPercent),
      sourceOfFunds: row.sourceOfFunds,
      beneficialOwner: row.beneficialOwner ?? '',
    });
  }

  deleteShareholder(row: SignificantShareholderResponse): void {
    if (this.application === null) {
      return;
    }

    this.dialog
      .open<ConfirmDialogComponent, unknown, boolean>(ConfirmDialogComponent, {
        width: '460px',
        data: {
          title: 'Delete shareholder?',
          message: `${row.fullName} will be removed from this application record.`,
          confirmLabel: 'Delete',
          variant: 'danger',
        },
      })
      .afterClosed()
      .subscribe((confirmed) => {
        if (confirmed && this.application !== null) {
          this.regulatorySaving = true;
          this.applicationsService
            .deleteShareholder(this.application.id, row.id)
            .pipe(finalize(() => (this.regulatorySaving = false)))
            .subscribe({
              next: () => {
                this.notify.success('Shareholder deleted.');
                this.refreshRegulatoryWorkflows();
              },
              error: () => this.notify.error('Shareholder could not be deleted.'),
            });
        }
      });
  }

  markShareholderFitAndProper(row: SignificantShareholderResponse): void {
    if (this.application === null) {
      return;
    }

    this.dialog
      .open<FitProperDialogComponent, unknown, FitProperDialogResult | false>(
        FitProperDialogComponent,
        {
          width: '560px',
          maxWidth: '95vw',
          data: { shareholderName: row.fullName },
        },
      )
      .afterClosed()
      .subscribe((result) => {
        if (!result || this.application === null) {
          return;
        }

        const body: MarkShareholderFitAndProperRequest = {
          status: result.status,
          justification: result.justification,
        };

        this.regulatorySaving = true;
        this.applicationsService
          .markShareholderFitAndProper(this.application.id, row.id, body)
          .pipe(finalize(() => (this.regulatorySaving = false)))
          .subscribe({
            next: () => {
              this.notify.success('Fit-and-proper review saved.');
              this.refreshRegulatoryWorkflows();
            },
            error: () => this.notify.error('Fit-and-proper review could not be saved.'),
          });
      });
  }

  resetShareholderForm(): void {
    this.editingShareholderId = null;
    this.shareholderForm.reset({
      shareholderType: ShareholderType.NaturalPerson,
      fullName: '',
      registrationNumber: '',
      country: 'RW',
      ownershipPercent: 0,
      sourceOfFunds: '',
      beneficialOwner: '',
    });
  }

  saveSeniorManager(): void {
    if (this.application === null || this.seniorManagerForm.invalid) {
      this.seniorManagerForm.markAllAsTouched();
      return;
    }

    const value = this.seniorManagerForm.getRawValue();
    const body: SaveSeniorManagerRequest = {
      role: value.role,
      fullName: value.fullName,
      email: value.email,
      nationality: value.nationality,
      yearsExperience: Number(value.yearsExperience),
      fitAndProperAttested: value.fitAndProperAttested,
    };
    const request =
      this.editingSeniorManagerId === null
        ? this.applicationsService.createSeniorManager(this.application.id, body)
        : this.applicationsService.updateSeniorManager(
            this.application.id,
            this.editingSeniorManagerId,
            body,
          );

    this.regulatorySaving = true;
    request.pipe(finalize(() => (this.regulatorySaving = false))).subscribe({
      next: () => {
        this.notify.success(
          this.editingSeniorManagerId === null
            ? 'Senior manager added.'
            : 'Senior manager updated.',
        );
        this.resetSeniorManagerForm();
        this.refreshRegulatoryWorkflows();
      },
      error: () => this.notify.error('Senior manager record could not be saved.'),
    });
  }

  editSeniorManager(row: SeniorManagerResponse): void {
    this.editingSeniorManagerId = row.id;
    this.seniorManagerForm.patchValue({
      role: row.role,
      fullName: row.fullName,
      email: row.email,
      nationality: row.nationality,
      yearsExperience: row.yearsExperience,
      fitAndProperAttested: row.fitAndProperAttested,
    });
  }

  deleteSeniorManager(row: SeniorManagerResponse): void {
    if (this.application === null) {
      return;
    }

    this.dialog
      .open<ConfirmDialogComponent, unknown, boolean>(ConfirmDialogComponent, {
        width: '460px',
        data: {
          title: 'Delete senior manager?',
          message: `${row.fullName} will be removed from this application record.`,
          confirmLabel: 'Delete',
          variant: 'danger',
        },
      })
      .afterClosed()
      .subscribe((confirmed) => {
        if (confirmed && this.application !== null) {
          this.regulatorySaving = true;
          this.applicationsService
            .deleteSeniorManager(this.application.id, row.id)
            .pipe(finalize(() => (this.regulatorySaving = false)))
            .subscribe({
              next: () => {
                this.notify.success('Senior manager deleted.');
                this.refreshRegulatoryWorkflows();
              },
              error: () => this.notify.error('Senior manager could not be deleted.'),
            });
        }
      });
  }

  resetSeniorManagerForm(): void {
    this.editingSeniorManagerId = null;
    this.seniorManagerForm.reset({
      role: SeniorManagerRole.ChiefExecutive,
      fullName: '',
      email: '',
      nationality: 'RW',
      yearsExperience: 0,
      fitAndProperAttested: false,
    });
  }

  addDeficiencyRow(): void {
    if (this.deficiencyForm.invalid) {
      this.deficiencyForm.markAllAsTouched();
      return;
    }
    this.deficiencyRows = [...this.deficiencyRows, this.deficiencyForm.getRawValue()];
    this.deficiencyForm.reset({ entity: '', reason: '', rectificationDeadline: '' });
  }

  removeDeficiencyRow(index: number): void {
    this.deficiencyRows = this.deficiencyRows.filter((_, i) => i !== index);
  }

  get isDeficientLetter(): boolean {
    return this.informationLetterForm.controls.letterType.value === 'DEFICIENT';
  }

  issueInformationLetter(): void {
    if (this.application === null || this.informationLetterForm.invalid) {
      this.informationLetterForm.markAllAsTouched();
      return;
    }

    const value = this.informationLetterForm.getRawValue();
    let composedBody = value.body;

    if (value.letterType === 'DEFICIENT' && this.deficiencyRows.length > 0) {
      const rows = this.deficiencyRows
        .map(
          (r, i) =>
            `${i + 1}. ${r.entity}: ${r.reason} (rectification deadline: ${r.rectificationDeadline})`,
        )
        .join('\n');
      composedBody = `${composedBody}\n\nDeficiencies:\n${rows}`;
    }

    this.regulatorySaving = true;
    this.lastIssuedLetter = null;
    this.applicationsService
      .issueInformationLetter(this.application.id, {
        subject: value.subject,
        body: composedBody,
        responseDays: Number(value.responseDays),
      })
      .pipe(finalize(() => (this.regulatorySaving = false)))
      .subscribe({
        next: (letter) => {
          this.notify.success('Information letter issued.');
          this.lastIssuedLetter = letter;
          this.deficiencyRows = [];
          this.informationLetterForm.reset({
            letterType: 'COMPLETE',
            subject: '',
            body: '',
            responseDays: 10,
          });
          this.refreshRegulatoryWorkflows();
        },
        error: () => this.notify.error('Information letter could not be issued.'),
      });
  }

  downloadLastIssuedLetter(): void {
    if (this.application === null || this.lastIssuedLetter === null) {
      return;
    }

    this.applicationsService
      .downloadInformationLetter(this.application.id, this.lastIssuedLetter.id)
      .subscribe({
        next: (blob) =>
          this.downloadBlob(
            blob,
            `${this.application!.referenceNumber}-${this.lastIssuedLetter!.id}.pdf`,
          ),
        error: () => this.notify.error('Information letter could not be downloaded.'),
      });
  }

  downloadInformationLetter(row: InformationLetterResponse): void {
    if (this.application === null) {
      return;
    }

    this.applicationsService.downloadInformationLetter(this.application.id, row.id).subscribe({
      next: (blob) => {
        this.downloadBlob(blob, `${this.application!.referenceNumber}-${row.id}.pdf`);
      },
      error: () => this.notify.error('Information letter could not be downloaded.'),
    });
  }

  selectFeeProofFile(): void {
    if (!this.canEditRegulatory()) {
      return;
    }

    this.feeProofInput.nativeElement.value = '';
    this.feeProofInput.nativeElement.click();
  }

  onFeeProofSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];

    if (file === undefined || this.application === null) {
      return;
    }

    this.feeProofLoading = true;
    this.documentsService
      .upload(this.application.id, DocumentSlot.ApplicationFeeProof, file)
      .pipe(
        switchMap((document) =>
          this.applicationsService.submitFeeProof(this.application!.id, {
            documentId: document.id,
          }),
        ),
        finalize(() => (this.feeProofLoading = false)),
      )
      .subscribe({
        next: () => {
          this.notify.success('Payment proof submitted.');
          this.loadDocuments(this.application!.id);
          this.refreshRegulatoryWorkflows();
        },
        error: () => this.notify.error('Payment proof could not be submitted.'),
      });
  }

  handleShareholderAction(event: TableActionEvent<SignificantShareholderResponse>): void {
    if (event.actionId === 'edit') {
      this.editShareholder(event.row);
    }

    if (event.actionId === 'delete') {
      this.deleteShareholder(event.row);
    }

    if (event.actionId === 'fit-and-proper') {
      this.markShareholderFitAndProper(event.row);
    }
  }

  handleSeniorManagerAction(event: TableActionEvent<SeniorManagerResponse>): void {
    if (event.actionId === 'edit') {
      this.editSeniorManager(event.row);
    }

    if (event.actionId === 'delete') {
      this.deleteSeniorManager(event.row);
    }
  }

  handleInformationLetterAction(event: TableActionEvent<InformationLetterResponse>): void {
    if (event.actionId === 'download') {
      this.downloadInformationLetter(event.row);
    }
  }

  totalOwnershipLabel(): string {
    const total = this.shareholders.reduce(
      (sum, shareholder) => sum + Number(shareholder.ownershipPercent),
      0,
    );
    return formatPercent(total);
  }

  managerRoleLabel(role: SeniorManagerRole): string {
    return seniorManagerRoleLabel(role);
  }

  managerRolePresent(role: SeniorManagerRole): boolean {
    return this.seniorManagers.some(
      (manager) => manager.role === role && manager.fitAndProperAttested,
    );
  }

  feeProofDocument(): ApplicationDocumentResponse | null {
    if (this.fee?.proofDocumentId === null || this.fee?.proofDocumentId === undefined) {
      return null;
    }

    return this.documents.find((document) => document.id === this.fee?.proofDocumentId) ?? null;
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
      this.notify.error(
        'Regulatory checklist has blocking gaps. Complete required evidence before submission.',
      );
      return;
    }

    const blockingItems = this.blockingComplianceItems.map((item) => ({
      item: item.title,
      requiredEvidence: this.requiredEvidenceLabel(item),
    }));

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

  private loadRegulatory(applicationId: string): void {
    this.regulatoryLoading = true;
    this.regulatoryError = false;
    forkJoin({
      capitalDeclaration: this.applicationsService.capitalDeclaration(applicationId),
      shareholders: this.applicationsService.shareholders(applicationId),
      seniorManagers: this.applicationsService.seniorManagers(applicationId),
      documentSlotSpecs: this.applicationsService.documentSlotSpecs(applicationId),
      complianceFindings: this.applicationsService.complianceFindings(applicationId),
      decisions: this.applicationsService.decisions(applicationId),
      informationLetters: this.applicationsService.informationLetters(applicationId),
      fee: this.applicationsService.fee(applicationId),
      slaClocks: this.applicationsService.slaClocks(applicationId),
      permittedActivities: this.applicationsService.permittedActivities(applicationId),
    })
      .pipe(finalize(() => (this.regulatoryLoading = false)))
      .subscribe({
        next: (response) => {
          this.capitalDeclaration = response.capitalDeclaration;
          this.shareholders = response.shareholders;
          this.seniorManagers = response.seniorManagers;
          this.documentSlotSpecs = response.documentSlotSpecs;
          this.complianceFindings = response.complianceFindings;
          this.decisions = response.decisions;
          this.informationLetters = response.informationLetters;
          this.fee = response.fee;
          this.slaClocks = response.slaClocks;
          this.permittedActivities = response.permittedActivities;
          this.patchRegulatoryForms();
        },
        error: () => {
          this.regulatoryError = true;
          this.capitalDeclaration = null;
          this.shareholders = [];
          this.seniorManagers = [];
          this.documentSlotSpecs = [];
          this.complianceFindings = [];
          this.decisions = [];
          this.informationLetters = [];
          this.fee = null;
          this.slaClocks = [];
          this.permittedActivities = [];
        },
      });
  }

  private patchRegulatoryForms(): void {
    if (this.capitalDeclaration !== null) {
      this.capitalForm.patchValue({
        amountRwf: Number(this.capitalDeclaration.amountRwf),
        sourceSummary: this.capitalDeclaration.sourceSummary,
      });
    } else if (this.application !== null) {
      this.capitalForm.patchValue({
        amountRwf: Number(this.application.paidUpCapitalRwf),
        sourceSummary: '',
      });
    }
  }

  private refreshRegulatoryWorkflows(): void {
    if (this.application === null) {
      return;
    }

    this.loadRegulatory(this.application.id);
    this.loadCompliance(this.application.id);
  }

  private optionalText(value: string): string | undefined {
    const trimmed = value.trim();
    return trimmed.length === 0 ? undefined : trimmed;
  }

  private downloadBlob(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const anchor = globalThis.document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    anchor.click();
    URL.revokeObjectURL(url);
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
        next: (checklist) => {
          this.compliance = checklist;
          this.updateChecklistState(checklist);
        },
        error: () => {
          this.compliance = null;
          this.resetChecklistState();
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

  private updateChecklistState(checklist: ComplianceChecklistResponse): void {
    this.allChecklistItems = this.uniqueChecklistItems(
      checklist.sections.flatMap((section) => section.items),
    );
    this.blockingComplianceItems = this.allChecklistItems.filter(
      (item) => item.blocking && item.status !== ComplianceCheckStatus.Complete,
    );
    this.requiredComplianceItems = this.allChecklistItems.filter((item) => item.blocking);
    this.uploadableRequirements = this.requiredComplianceItems.filter(
      (item) => item.requiredSlots.length > 0,
    );
    this.missingDocuments = this.uploadableRequirements.filter(
      (item) => item.status !== ComplianceCheckStatus.Complete,
    ).length;
    this.uploadedRequiredDocuments = this.uploadableRequirements.filter(
      (item) => item.status === ComplianceCheckStatus.Complete,
    ).length;
    this.readinessScore =
      this.uploadableRequirements.length === 0
        ? 100
        : Math.round((this.uploadedRequiredDocuments / this.uploadableRequirements.length) * 100);
  }

  private resetChecklistState(): void {
    this.allChecklistItems = [];
    this.blockingComplianceItems = [];
    this.requiredComplianceItems = [];
    this.uploadableRequirements = [];
    this.missingDocuments = 0;
    this.uploadedRequiredDocuments = 0;
    this.readinessScore = 100;
  }

  private uniqueChecklistItems(items: ComplianceChecklistItem[]): ComplianceChecklistItem[] {
    const seen = new Set<string>();
    return items.filter((item) => {
      if (seen.has(item.id)) {
        return false;
      }

      seen.add(item.id);
      return true;
    });
  }

  private hasRequiredEvidence(): boolean {
    if (this.compliance === null) {
      return true;
    }

    return this.blockingComplianceItems.length === 0;
  }

  private selectedDocumentSlot(): DocumentSlot | '' {
    return (this.uploadForm.controls.slot.value as DocumentSlot | '') || this.selectedSlot;
  }

  get sortedComplianceFindings(): ComplianceFindingRecordResponse[] {
    const order: Record<ComplianceFindingSeverity, number> = {
      [ComplianceFindingSeverity.Blocking]: 0,
      [ComplianceFindingSeverity.Warning]: 1,
      [ComplianceFindingSeverity.Info]: 2,
    };
    return [...this.complianceFindings].sort(
      (a, b) => (order[a.severity] ?? 3) - (order[b.severity] ?? 3),
    );
  }

  get openBlockingFindingCount(): number {
    return this.complianceFindings.filter(
      (f) =>
        f.severity === ComplianceFindingSeverity.Blocking &&
        f.status === ComplianceFindingStatus.Open,
    ).length;
  }

  slaProgress(clock: ApplicationSlaClockResponse): number {
    const start = new Date(clock.startedAt).getTime();
    const due = new Date(clock.dueAt).getTime();
    const now = Date.now();
    if (now >= due) return 100;
    if (now <= start) return 0;
    return Math.round(((now - start) / (due - start)) * 100);
  }

  slaClockState(clock: ApplicationSlaClockResponse): 'closed' | 'breached' | 'warned' | 'open' {
    if (clock.stoppedAt !== null) return 'closed';
    if (clock.breachedAt !== null) return 'breached';
    return this.slaProgress(clock) > 80 ? 'warned' : 'open';
  }

  slaProgressLabel(clock: ApplicationSlaClockResponse): string {
    const state = this.slaClockState(clock);
    if (state === 'closed') return 'Closed';
    if (state === 'breached') {
      const due = new Date(clock.dueAt).getTime();
      const days = Math.max(0, Math.floor((Date.now() - due) / 86400000));
      return `Breached (${days}d overdue)`;
    }
    return `${this.slaProgress(clock)}% elapsed`;
  }

  get hasBreachedClock(): boolean {
    return this.slaClocks.some((c) => c.breachedAt !== null && c.stoppedAt === null);
  }
}
