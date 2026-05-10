import { Component, OnInit } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { Router } from '@angular/router';
import { finalize } from 'rxjs';

import { UserRole } from '../../core/enums/user-role.enum';
import { UserResponse, ListUsersQuery } from '../../core/interfaces/user.interface';
import { TableActionEvent, TablePageEvent } from '../../core/interfaces/table.interface';
import { usersTableConfig } from '../../core/providers/tables/users-table.config';
import { NotifyService } from '../../core/services/notify.service';
import { UsersService } from '../../core/services/users.service';
import { normalizePagedResponse } from '../../core/utils/api-list-normalizer';
import { ButtonComponent } from '../../shared/components/button/button.component';
import { ErrorStateComponent } from '../../shared/components/error-state/error-state.component';
import { TableComponent } from '../../shared/components/table/table.component';
import { UserDialogComponent } from './user-dialog/user-dialog.component';

@Component({
  selector: 'app-admin-users',
  standalone: true,
  imports: [ButtonComponent, ErrorStateComponent, TableComponent],
  templateUrl: './admin-users.component.html',
})
export class AdminUsersComponent implements OnInit {
  readonly config = usersTableConfig;
  users: UserResponse[] = [];
  isLoading = true;
  hasError = false;
  totalRecords = 0;
  totalPages = 0;

  private searchQuery = '';
  private filterRole: UserRole | undefined;
  private currentPage = 0;
  private readonly pageSize = 20;

  constructor(
    private readonly usersService: UsersService,
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

    const query: ListUsersQuery = { page: this.currentPage, size: this.pageSize };
    if (this.searchQuery) query.q = this.searchQuery;
    if (this.filterRole !== undefined) query.role = this.filterRole;

    this.usersService
      .list(query)
      .pipe(finalize(() => (this.isLoading = false)))
      .subscribe({
        next: (response) => {
          const result = normalizePagedResponse(response);
          this.users = result.records;
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
    this.filterRole = filters['role'] as UserRole | undefined;
    this.currentPage = 0;
    this.load();
  }

  handlePage(event: TablePageEvent): void {
    this.currentPage = Math.max((event.pageNumber || 1) - 1, 0);
    this.load();
  }

  create(): void {
    this.openDialog();
  }

  handleAction(event: TableActionEvent<UserResponse>): void {
    if (event.actionId === 'view') {
      void this.router.navigate(['/admin/users', event.row.id]);
      return;
    }

    if (event.actionId === 'edit') {
      this.openDialog(event.row);
      return;
    }

    if (event.actionId === 'deactivate') {
      this.usersService.deactivate(event.row.id).subscribe(() => {
        this.notify.success('User deactivated.');
        this.load();
      });
      return;
    }

    if (event.actionId === 'reactivate') {
      this.usersService.reactivate(event.row.id).subscribe(() => {
        this.notify.success('User reactivated.');
        this.load();
      });
    }
  }

  private openDialog(user?: UserResponse): void {
    this.dialog
      .open<UserDialogComponent, unknown, { success: boolean }>(UserDialogComponent, {
        width: '900px',
        maxWidth: '95vw',
        maxHeight: '95vh',
        data: { user },
      })
      .afterClosed()
      .subscribe((result) => {
        if (result?.success) this.load();
      });
  }
}
