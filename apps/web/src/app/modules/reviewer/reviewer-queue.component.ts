import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { finalize } from 'rxjs';

import { ApplicationState } from '../../core/enums/application-state.enum';
import {
  ApplicationResponse,
  ListApplicationsQuery,
} from '../../core/interfaces/application.interface';
import { TableActionEvent, TablePageEvent } from '../../core/interfaces/table.interface';
import { reviewerQueueApplicationTableConfig } from '../../core/providers/tables/application-table.config';
import { ApplicationsService } from '../../core/services/applications.service';
import { NotifyService } from '../../core/services/notify.service';
import { normalizePagedResponse } from '../../core/utils/api-list-normalizer';
import { ErrorStateComponent } from '../../shared/components/error-state/error-state.component';
import { TableComponent } from '../../shared/components/table/table.component';

@Component({
  selector: 'app-reviewer-queue',
  standalone: true,
  imports: [ErrorStateComponent, TableComponent],
  templateUrl: './reviewer-queue.component.html',
})
export class ReviewerQueueComponent implements OnInit {
  readonly config = reviewerQueueApplicationTableConfig;
  applications: ApplicationResponse[] = [];
  isLoading = true;
  hasError = false;
  totalRecords = 0;
  totalPages = 0;

  private searchQuery = '';
  private currentPage = 0;
  private readonly pageSize = 20;

  constructor(
    private readonly applicationsService: ApplicationsService,
    private readonly notify: NotifyService,
    private readonly router: Router,
  ) {}

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.isLoading = true;
    this.hasError = false;
    const query: ListApplicationsQuery = {
      state: ApplicationState.Submitted,
      page: this.currentPage,
      size: this.pageSize,
    };
    if (this.searchQuery) query.q = this.searchQuery;

    this.applicationsService
      .list(query)
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
    if (event.actionId === 'view') {
      void this.router.navigate(['/applications', event.row.id]);
      return;
    }

    if (event.actionId === 'claim') {
      this.applicationsService.claim(event.row.id).subscribe((application) => {
        this.notify.success('Application claimed.');
        void this.router.navigate(['/applications', application.id]);
      });
    }
  }
}
