import { Component, OnInit } from '@angular/core';
import { finalize } from 'rxjs';

import { SystemLogLevel } from '../../core/enums/system-log-level.enum';
import { ListSystemLogsQuery, SystemLogResponse } from '../../core/interfaces/system-log.interface';
import { TablePageEvent } from '../../core/interfaces/table.interface';
import { systemLogsTableConfig } from '../../core/providers/tables/system-logs-table.config';
import { NotifyService } from '../../core/services/notify.service';
import { SystemLogsService } from '../../core/services/system-logs.service';
import { normalizePagedResponse } from '../../core/utils/api-list-normalizer';
import { ButtonComponent } from '../../shared/components/button/button.component';
import { ErrorStateComponent } from '../../shared/components/error-state/error-state.component';
import { TableComponent } from '../../shared/components/table/table.component';

@Component({
  selector: 'app-system-logs',
  standalone: true,
  imports: [ButtonComponent, ErrorStateComponent, TableComponent],
  templateUrl: './system-logs.component.html',
})
export class SystemLogsComponent implements OnInit {
  readonly config = systemLogsTableConfig;
  logs: SystemLogResponse[] = [];
  isLoading = true;
  isExporting = false;
  hasError = false;
  totalRecords = 0;
  totalPages = 0;

  private searchQuery = '';
  private level: SystemLogLevel | undefined;
  private currentPage = 0;
  private readonly pageSize = 20;

  constructor(
    private readonly systemLogsService: SystemLogsService,
    private readonly notify: NotifyService,
  ) {}

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.isLoading = true;
    this.hasError = false;

    this.systemLogsService
      .list(this.query())
      .pipe(finalize(() => (this.isLoading = false)))
      .subscribe({
        next: (response) => {
          const result = normalizePagedResponse(response);
          this.logs = result.records;
          this.totalRecords = result.totalRecords;
          this.totalPages = result.totalPages;
        },
        error: () => {
          this.logs = [];
          this.totalRecords = 0;
          this.totalPages = 0;
          this.hasError = true;
        },
      });
  }

  handleSearch(term: string): void {
    this.searchQuery = term;
    this.currentPage = 0;
    this.load();
  }

  handleFilters(filters: Record<string, unknown>): void {
    this.level = filters['level'] as SystemLogLevel | undefined;
    this.currentPage = 0;
    this.load();
  }

  handlePage(event: TablePageEvent): void {
    this.currentPage = Math.max((event.pageNumber || 1) - 1, 0);
    this.load();
  }

  exportLogs(): void {
    this.isExporting = true;
    this.systemLogsService
      .export(this.query(false))
      .pipe(finalize(() => (this.isExporting = false)))
      .subscribe({
        next: (blob) => this.download(blob),
        error: () => this.notify.error('Unable to export system logs.'),
      });
  }

  private query(includePage = true): ListSystemLogsQuery {
    const query: ListSystemLogsQuery = {};

    if (includePage) {
      query.page = this.currentPage;
      query.size = this.pageSize;
    }

    if (this.searchQuery !== '') {
      query.q = this.searchQuery;
    }

    if (this.level !== undefined) {
      query.level = this.level;
    }

    return query;
  }

  private download(blob: Blob): void {
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `system-logs-${new Date().toISOString().slice(0, 10)}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
    this.notify.success('System logs exported.');
  }
}
