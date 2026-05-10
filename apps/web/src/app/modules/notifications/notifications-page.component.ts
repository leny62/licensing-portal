import { Component, OnInit } from '@angular/core';
import { finalize } from 'rxjs';

import { NotificationResponse } from '../../core/interfaces/notification.interface';
import { TableActionEvent } from '../../core/interfaces/table.interface';
import { notificationsTableConfig } from '../../core/providers/tables/notifications-table.config';
import { NotificationsService } from '../../core/services/notifications.service';
import { NotifyService } from '../../core/services/notify.service';
import { normalizePagedResponse } from '../../core/utils/api-list-normalizer';
import { ErrorStateComponent } from '../../shared/components/error-state/error-state.component';
import { TableComponent } from '../../shared/components/table/table.component';

@Component({
  selector: 'app-notifications-page',
  standalone: true,
  imports: [ErrorStateComponent, TableComponent],
  templateUrl: './notifications-page.component.html',
})
export class NotificationsPageComponent implements OnInit {
  readonly config = notificationsTableConfig;
  notifications: NotificationResponse[] = [];
  isLoading = true;
  hasError = false;

  constructor(
    private readonly notificationsService: NotificationsService,
    private readonly notify: NotifyService,
  ) {}

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.isLoading = true;
    this.hasError = false;

    this.notificationsService
      .list()
      .pipe(finalize(() => (this.isLoading = false)))
      .subscribe({
        next: (response) => (this.notifications = normalizePagedResponse(response).records),
        error: () => {
          this.notifications = [];
          this.hasError = true;
        },
      });
  }

  handleAction(event: TableActionEvent<NotificationResponse>): void {
    if (event.actionId !== 'read' || event.row.readAt !== null) {
      return;
    }

    this.notificationsService.markRead(event.row.id).subscribe(() => {
      this.notify.success('Notification marked read.');
      this.load();
    });
  }
}
