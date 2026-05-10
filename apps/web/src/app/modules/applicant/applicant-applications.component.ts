import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { finalize } from 'rxjs';

import { ApplicationState } from '../../core/enums/application-state.enum';
import {
  ApplicationResponse,
  ListApplicationsQuery,
} from '../../core/interfaces/application.interface';
import { TableActionEvent, TablePageEvent } from '../../core/interfaces/table.interface';
import { applicantApplicationTableConfig } from '../../core/providers/tables/application-table.config';
import { ApplicationsService } from '../../core/services/applications.service';
import { NotifyService } from '../../core/services/notify.service';
import { normalizePagedResponse } from '../../core/utils/api-list-normalizer';
import { ButtonComponent } from '../../shared/components/button/button.component';
import { ErrorStateComponent } from '../../shared/components/error-state/error-state.component';
import { TableComponent } from '../../shared/components/table/table.component';
import { ApplicationEditorDialogComponent } from '../applications/application-editor-dialog/application-editor-dialog.component';

@Component({
  selector: 'app-applicant-applications',
  standalone: true,
  imports: [ButtonComponent, ErrorStateComponent, TableComponent],
  templateUrl: './applicant-applications.component.html',
})
export class ApplicantApplicationsComponent implements OnInit {
  readonly config = applicantApplicationTableConfig;
  applications: ApplicationResponse[] = [];
  isLoading = true;
  hasError = false;
  totalRecords = 0;
  totalPages = 0;

  private searchQuery = '';
  private filterState: ApplicationState | undefined;
  private currentPage = 0;
  private readonly pageSize = 20;

  constructor(
    private readonly applicationsService: ApplicationsService,
    private readonly dialog: MatDialog,
    private readonly notify: NotifyService,
    private readonly router: Router,
  ) {}

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.isLoading = true;
    this.hasError = false;

    const query: ListApplicationsQuery = { page: this.currentPage, size: this.pageSize };
    if (this.searchQuery) query.q = this.searchQuery;
    if (this.filterState !== undefined) query.state = this.filterState;

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

  handleFilters(filters: Record<string, unknown>): void {
    this.filterState = filters['state'] as ApplicationState | undefined;
    this.currentPage = 0;
    this.load();
  }

  handlePage(event: TablePageEvent): void {
    this.currentPage = Math.max((event.pageNumber || 1) - 1, 0);
    this.load();
  }

  create(): void {
    this.dialog
      .open<ApplicationEditorDialogComponent, unknown, { success: boolean }>(
        ApplicationEditorDialogComponent,
        { width: '900px', maxWidth: '95vw', maxHeight: '95vh', data: {} },
      )
      .afterClosed()
      .subscribe((result) => {
        if (result?.success) this.load();
      });
  }

  handleAction(event: TableActionEvent<ApplicationResponse>): void {
    const application = event.row;

    if (event.actionId === 'view') {
      void this.router.navigate(['/applications', application.id]);
      return;
    }

    if (event.actionId === 'edit') {
      this.dialog
        .open<ApplicationEditorDialogComponent, unknown, { success: boolean }>(
          ApplicationEditorDialogComponent,
          { width: '900px', maxWidth: '95vw', maxHeight: '95vh', data: { application } },
        )
        .afterClosed()
        .subscribe((result) => {
          if (result?.success) this.load();
        });
      return;
    }

    if (event.actionId === 'submit') {
      this.applicationsService.submit(application.id).subscribe(() => {
        this.notify.success('Application submitted.');
        this.load();
      });
      return;
    }

    if (event.actionId === 'withdraw') {
      this.applicationsService.withdraw(application.id).subscribe(() => {
        this.notify.success('Application withdrawn.');
        this.load();
      });
      return;
    }

    if (event.actionId === 'resubmit') {
      this.applicationsService.resubmit(application.id).subscribe(() => {
        this.notify.success('Application resubmitted.');
        this.load();
      });
    }
  }
}
