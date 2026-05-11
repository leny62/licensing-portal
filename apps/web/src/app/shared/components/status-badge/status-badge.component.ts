import { NgClass } from '@angular/common';
import { Component, Input } from '@angular/core';

import { ApplicationState } from '../../../core/enums/application-state.enum';
import { ComplianceCheckStatus } from '../../../core/enums/compliance-check-status.enum';
import {
  ApplicationDecisionOutcome,
  ComplianceFindingSeverity,
  ComplianceFindingStatus,
  FeeStatus,
  FitAndProperStatus,
  InformationLetterStatus,
} from '../../../core/enums/regulatory-status.enum';
import { UserRole } from '../../../core/enums/user-role.enum';

@Component({
  selector: 'app-status-badge',
  standalone: true,
  imports: [NgClass],
  templateUrl: './status-badge.component.html',
  styleUrl: './status-badge.component.scss',
})
export class StatusBadgeComponent {
  @Input({ required: true }) state!: ApplicationState | UserRole | string;

  get label(): string {
    const labels: Record<string, string> = {
      [ApplicationState.Draft]: 'Draft',
      [ApplicationState.Submitted]: 'Submitted',
      [ApplicationState.UnderReview]: 'Under review',
      [ApplicationState.AwaitingApplicantResponse]: 'Awaiting applicant response',
      [ApplicationState.RecommendedForApproval]: 'Recommended approval',
      [ApplicationState.RecommendedForRejection]: 'Recommended rejection',
      [ApplicationState.Approved]: 'Approved',
      [ApplicationState.Rejected]: 'Rejected',
      [ApplicationState.Withdrawn]: 'Withdrawn',
      [UserRole.Applicant]: 'Applicant',
      [UserRole.Reviewer]: 'Reviewer',
      [UserRole.Approver]: 'Approver',
      [UserRole.Admin]: 'Admin',
      Active: 'Active',
      Inactive: 'Inactive',
      active: 'Active',
      inactive: 'Inactive',
      true: 'Active',
      false: 'Inactive',
      DEBUG: 'Debug',
      INFO: 'Info',
      WARN: 'Warn',
      ERROR: 'Error',
      [ComplianceCheckStatus.Complete]: 'Complete',
      [ComplianceCheckStatus.Missing]: 'Missing',
      [ComplianceCheckStatus.ReviewRequired]: 'Needs review',
      [ComplianceCheckStatus.NotApplicable]: 'Not applicable',
      [ComplianceFindingSeverity.Warning]: 'Warning',
      [ComplianceFindingSeverity.Blocking]: 'Blocking',
      [ComplianceFindingStatus.Open]: 'Open',
      [ComplianceFindingStatus.Resolved]: 'Resolved',
      [ComplianceFindingStatus.Waived]: 'Waived',
      [ApplicationDecisionOutcome.Approve]: 'Approved',
      [ApplicationDecisionOutcome.Reject]: 'Rejected',
      [ApplicationDecisionOutcome.RequestInformation]: 'Requested information',
      [ApplicationDecisionOutcome.Defer]: 'Deferred',
      [InformationLetterStatus.Issued]: 'Issued',
      [InformationLetterStatus.Responded]: 'Responded',
      [InformationLetterStatus.Overdue]: 'Overdue',
      [FeeStatus.Pending]: 'Pending',
      [FeeStatus.ProofSubmitted]: 'Proof submitted',
      [FeeStatus.Verified]: 'Verified',
      [FitAndProperStatus.Cleared]: 'Cleared',
      [FitAndProperStatus.Failed]: 'Failed',
    };

    return labels[this.state] ?? this.state;
  }

  get tone(): string {
    const tones: Record<string, string> = {
      [ApplicationState.Draft]: 'neutral',
      [ApplicationState.Submitted]: 'amber',
      [ApplicationState.UnderReview]: 'blue',
      [ApplicationState.AwaitingApplicantResponse]: 'amber',
      [ApplicationState.RecommendedForApproval]: 'green',
      [ApplicationState.RecommendedForRejection]: 'red',
      [ApplicationState.Approved]: 'green',
      [ApplicationState.Rejected]: 'red',
      [ApplicationState.Withdrawn]: 'neutral',
      [UserRole.Applicant]: 'blue',
      [UserRole.Reviewer]: 'amber',
      [UserRole.Approver]: 'purple',
      [UserRole.Admin]: 'teal',
      Active: 'green',
      Inactive: 'neutral',
      active: 'green',
      inactive: 'neutral',
      true: 'green',
      false: 'neutral',
      DEBUG: 'neutral',
      INFO: 'blue',
      WARN: 'amber',
      ERROR: 'red',
      [ComplianceCheckStatus.Complete]: 'green',
      [ComplianceCheckStatus.Missing]: 'red',
      [ComplianceCheckStatus.ReviewRequired]: 'amber',
      [ComplianceCheckStatus.NotApplicable]: 'neutral',
      [ComplianceFindingSeverity.Warning]: 'amber',
      [ComplianceFindingSeverity.Blocking]: 'red',
      [ComplianceFindingStatus.Open]: 'amber',
      [ComplianceFindingStatus.Resolved]: 'green',
      [ComplianceFindingStatus.Waived]: 'neutral',
      [ApplicationDecisionOutcome.Approve]: 'green',
      [ApplicationDecisionOutcome.Reject]: 'red',
      [ApplicationDecisionOutcome.RequestInformation]: 'amber',
      [ApplicationDecisionOutcome.Defer]: 'blue',
      [InformationLetterStatus.Issued]: 'blue',
      [InformationLetterStatus.Responded]: 'green',
      [InformationLetterStatus.Overdue]: 'red',
      [FeeStatus.Pending]: 'amber',
      [FeeStatus.ProofSubmitted]: 'blue',
      [FeeStatus.Verified]: 'green',
      [FitAndProperStatus.Cleared]: 'green',
      [FitAndProperStatus.Failed]: 'red',
    };

    return tones[this.state] ?? 'neutral';
  }
}
