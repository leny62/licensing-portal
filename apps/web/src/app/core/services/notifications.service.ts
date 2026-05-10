import { Injectable } from '@angular/core';
import { Observable, map } from 'rxjs';

import { ApiListResponse } from '../interfaces/api-list.interface';
import { NotificationResponse } from '../interfaces/notification.interface';
import { normalizePagedResponse } from '../utils/api-list-normalizer';
import { ApiService } from './api.service';

@Injectable({ providedIn: 'root' })
export class NotificationsService {
  constructor(private readonly api: ApiService) {}

  list(): Observable<NotificationResponse[]> {
    return this.api
      .get<ApiListResponse<NotificationResponse>>('/me/notifications')
      .pipe(map((response) => normalizePagedResponse(response).records));
  }

  markRead(id: string): Observable<NotificationResponse> {
    return this.api.post<NotificationResponse>(`/me/notifications/${id}/read`);
  }
}
