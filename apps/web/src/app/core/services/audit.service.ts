import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import {
  AuditListQuery,
  ApplicationAuditResponse,
  AuditChainVerificationResult,
} from '../interfaces/audit.interface';
import { ApiListResponse } from '../interfaces/api-list.interface';
import { ApiService } from './api.service';

@Injectable({ providedIn: 'root' })
export class AuditService {
  constructor(private readonly api: ApiService) {}

  list(
    applicationId: string,
    query?: AuditListQuery,
  ): Observable<ApiListResponse<ApplicationAuditResponse>> {
    return this.api.get<ApiListResponse<ApplicationAuditResponse>>(
      `/applications/${applicationId}/audit`,
      { params: query },
    );
  }

  verify(applicationId: string): Observable<AuditChainVerificationResult> {
    return this.api.get<AuditChainVerificationResult>(
      `/applications/${applicationId}/audit/verify`,
    );
  }
}
