import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { finalize } from 'rxjs';

import { ApplicationState } from '../../core/enums/application-state.enum';
import { ApplicationResponse } from '../../core/interfaces/application.interface';
import { TableActionEvent, TablePageEvent } from '../../core/interfaces/table.interface';
import { approverApplicationTableConfig } from '../../core/providers/tables/application-table.config';
import { ApplicationsService } from '../../core/services/applications.service';
import { normalizePagedResponse } from '../../core/utils/api-list-normalizer';
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

  private readonly approverStates = [
    ApplicationState.RecommendedForApproval,
    ApplicationState.RecommendedForRejection,
  ];

  private readonly pageSize = 20;

  applications: ApplicationResponse[] = [];
  totalRecords = 0;
  totalPages = 0;
  currentPage = 0;
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

    this.applicationsService
      .list({
        state: this.approverStates,
        q: this.searchQuery || undefined,
        page: this.currentPage,
        size: this.pageSize,
      })
      .pipe(finalize(() => (this.isLoading = false)))
      .subscribe({
        next: (response) => {
          const result = normalizePagedResponse(response);
          this.applications = result.records;
          this.totalRecords = result.totalRecords;
          this.totalPages = result.totalPages;
        },
        error: () => (this.hasError = true),
      });
  }

  handleSearch(term: string): void {
    this.searchQuery = term;
    this.currentPage = 0;
    this.load();
  }

  handlePage(event: TablePageEvent): void {
    this.currentPage = Math.max((event.pageNumber || 1) - 1, 0);
    this.load();
  }

  handleAction(event: TableActionEvent<ApplicationResponse>): void {
    void this.router.navigate(['/applications', event.row.id]);
  }
}
