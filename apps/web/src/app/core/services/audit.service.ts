import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import {
  ApplicationAuditResponse,
  AuditChainVerificationResult,
} from '../interfaces/audit.interface';
import { ApiService } from './api.service';

@Injectable({ providedIn: 'root' })
export class AuditService {
  constructor(private readonly api: ApiService) {}

  list(applicationId: string): Observable<ApplicationAuditResponse[]> {
    return this.api.get<ApplicationAuditResponse[]>(`/applications/${applicationId}/audit`);
  }

  verify(applicationId: string): Observable<AuditChainVerificationResult> {
    return this.api.get<AuditChainVerificationResult>(
      `/applications/${applicationId}/audit/verify`,
    );
  }
}
