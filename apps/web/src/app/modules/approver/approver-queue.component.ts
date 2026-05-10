import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { forkJoin, finalize } from 'rxjs';

import { ApplicationState } from '../../core/enums/application-state.enum';
import { ApplicationResponse } from '../../core/interfaces/application.interface';
import { TableActionEvent } from '../../core/interfaces/table.interface';
import { approverApplicationTableConfig } from '../../core/providers/tables/application-table.config';
import { ApplicationsService } from '../../core/services/applications.service';
import { ErrorStateComponent } from '../../shared/components/error-state/error-state.component';
import { TableComponent } from '../../shared/components/table/table.component';

@Component({
  selector: 'app-approver-queue',
  standalone: true,
  imports: [ErrorStateComponent, TableComponent],
  templateUrl: './approver-queue.component.html',
})
export class ApproverQueueComponent implements OnInit {
  readonly config = approverApplicationTableConfig;
  applications: ApplicationResponse[] = [];
  isLoading = true;
  hasError = false;

  private searchQuery = '';

  constructor(
    private readonly applicationsService: ApplicationsService,
    private readonly router: Router,
  ) {}

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.isLoading = true;
    this.hasError = false;
    const q = this.searchQuery || undefined;
    // Two parallel calls merged client-side. Pagination is intentionally skipped here
    // because merging two independently paginated sets yields misaligned page boundaries.
    // Fix: backend should expose a multi-state filter endpoint.
    forkJoin([
      this.applicationsService.list({ state: ApplicationState.RecommendedForApproval, q, size: 50 }),
      this.applicationsService.list({ state: ApplicationState.RecommendedForRejection, q, size: 50 }),
    ])
      .pipe(finalize(() => (this.isLoading = false)))
      .subscribe({
        next: ([approval, rejection]) => {
          this.applications = [...approval.records, ...rejection.records];
        },
        error: () => (this.hasError = true),
      });
  }

  handleSearch(term: string): void {
    this.searchQuery = term;
    this.load();
  }

  handleAction(event: TableActionEvent<ApplicationResponse>): void {
    void this.router.navigate(['/applications', event.row.id]);
  }
}
