import { NgClass } from '@angular/common';
import { Component, Input } from '@angular/core';

import { ApplicationState } from '../../../core/enums/application-state.enum';
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
      [ApplicationState.ChangesRequested]: 'Changes requested',
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
    };

    return labels[this.state] ?? this.state;
  }

  get tone(): string {
    const tones: Record<string, string> = {
      [ApplicationState.Draft]: 'neutral',
      [ApplicationState.Submitted]: 'amber',
      [ApplicationState.UnderReview]: 'blue',
      [ApplicationState.ChangesRequested]: 'amber',
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
    };

    return tones[this.state] ?? 'neutral';
  }
}
