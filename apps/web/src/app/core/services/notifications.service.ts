import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { ApiListResponse } from '../interfaces/api-list.interface';
import { NotificationResponse } from '../interfaces/notification.interface';
import { ApiService } from './api.service';

@Injectable({ providedIn: 'root' })
export class NotificationsService {
  constructor(private readonly api: ApiService) {}

  list(): Observable<ApiListResponse<NotificationResponse>> {
    return this.api.get<ApiListResponse<NotificationResponse>>('/me/notifications');
  }

  markRead(id: string): Observable<NotificationResponse> {
    return this.api.post<NotificationResponse>(`/me/notifications/${id}/read`);
  }
}
