import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { ApplicationDocumentResponse } from '../interfaces/document.interface';
import { ApiService } from './api.service';

@Injectable({ providedIn: 'root' })
export class DocumentsService {
  constructor(private readonly api: ApiService) {}

  list(applicationId: string): Observable<ApplicationDocumentResponse[]> {
    return this.api.get<ApplicationDocumentResponse[]>(`/applications/${applicationId}/documents`);
  }

  upload(applicationId: string, slot: string, file: File): Observable<ApplicationDocumentResponse> {
    const body = new FormData();
    body.append('slot', slot);
    body.append('file', file);

    return this.api.post<ApplicationDocumentResponse, FormData>(
      `/applications/${applicationId}/documents`,
      body,
    );
  }
}
