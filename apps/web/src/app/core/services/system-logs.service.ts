import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { ApiListResponse } from '../interfaces/api-list.interface';
import { ListSystemLogsQuery, SystemLogResponse } from '../interfaces/system-log.interface';
import { ApiService } from './api.service';

@Injectable({ providedIn: 'root' })
export class SystemLogsService {
  constructor(private readonly api: ApiService) {}

  list(query?: ListSystemLogsQuery): Observable<ApiListResponse<SystemLogResponse>> {
    return this.api.get<ApiListResponse<SystemLogResponse>>('/system-logs', { params: query });
  }

  export(query?: ListSystemLogsQuery): Observable<Blob> {
    return this.api.download('/system-logs/export', { params: query });
  }
}
