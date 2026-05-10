import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { finalize } from 'rxjs';

import { ApplicationResponse, ListApplicationsQuery } from '../../core/interfaces/application.interface';
import { TableActionEvent, TablePageEvent } from '../../core/interfaces/table.interface';
import { reviewerAssignmentsApplicationTableConfig } from '../../core/providers/tables/application-table.config';
import { ApplicationsService } from '../../core/services/applications.service';
import { AuthService } from '../../core/services/auth.service';
import { ErrorStateComponent } from '../../shared/components/error-state/error-state.component';
import { TableComponent } from '../../shared/components/table/table.component';

@Component({
  selector: 'app-reviewer-assignments',
  standalone: true,
  imports: [ErrorStateComponent, TableComponent],
  templateUrl: './reviewer-assignments.component.html',
})
export class ReviewerAssignmentsComponent implements OnInit {
  readonly config = reviewerAssignmentsApplicationTableConfig;
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
    private readonly auth: AuthService,
    private readonly router: Router,
  ) {}

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    const user = this.auth.currentUser();
    this.isLoading = true;
    this.hasError = false;

    const query: ListApplicationsQuery = { page: this.currentPage, size: this.pageSize };
    if (user !== null) query.reviewerId = user.id;
    if (this.searchQuery) query.q = this.searchQuery;

    this.applicationsService
      .list(query)
      .pipe(finalize(() => (this.isLoading = false)))
      .subscribe({
        next: ({ records, totalRecords, totalPages }) => {
          this.applications = records;
          this.totalRecords = totalRecords;
          this.totalPages = totalPages;
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
