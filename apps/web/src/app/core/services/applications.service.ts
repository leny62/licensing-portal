import { Injectable } from '@angular/core';
import { Observable, map } from 'rxjs';

import { ApplicationDecision } from '../enums/application-decision.enum';
import { ApiListResponse, NormalizedList } from '../interfaces/api-list.interface';
import {
  ApplicationResponse,
  AssignReviewerRequest,
  CreateApplicationRequest,
  DecisionRequest,
  JustificationRequest,
  ListApplicationsQuery,
  RecommendationRequest,
  UpdateApplicationRequest,
} from '../interfaces/application.interface';
import { normalizePagedResponse } from '../utils/api-list-normalizer';
import { ApiService } from './api.service';

@Injectable({ providedIn: 'root' })
export class ApplicationsService {
  constructor(private readonly api: ApiService) {}

  list(query: ListApplicationsQuery = {}): Observable<NormalizedList<ApplicationResponse>> {
    return this.api
      .get<ApiListResponse<ApplicationResponse>>('/applications', { params: query })
      .pipe(map((response) => normalizePagedResponse(response)));
  }

  get(id: string): Observable<ApplicationResponse> {
    return this.api.get<ApplicationResponse>(`/applications/${id}`);
  }

  create(body: CreateApplicationRequest): Observable<ApplicationResponse> {
    return this.api.post<ApplicationResponse, CreateApplicationRequest>('/applications', body);
  }

  update(id: string, body: UpdateApplicationRequest): Observable<ApplicationResponse> {
    return this.api.patch<ApplicationResponse, UpdateApplicationRequest>(
      `/applications/${id}`,
      body,
    );
  }

  submit(id: string): Observable<ApplicationResponse> {
    return this.api.post<ApplicationResponse>(`/applications/${id}/submit`);
  }

  withdraw(id: string): Observable<ApplicationResponse> {
    return this.api.post<ApplicationResponse>(`/applications/${id}/withdraw`);
  }

  claim(id: string): Observable<ApplicationResponse> {
    return this.api.post<ApplicationResponse>(`/applications/${id}/claim`);
  }

  assign(id: string, reviewerId: string): Observable<ApplicationResponse> {
    return this.api.post<ApplicationResponse, AssignReviewerRequest>(`/applications/${id}/assign`, {
      reviewerId,
    });
  }

  requestInfo(id: string, justification: string): Observable<ApplicationResponse> {
    return this.api.post<ApplicationResponse, JustificationRequest>(
      `/applications/${id}/request-info`,
      { justification },
    );
  }

  resubmit(id: string): Observable<ApplicationResponse> {
    return this.api.post<ApplicationResponse>(`/applications/${id}/resubmit`);
  }

  recommend(
    id: string,
    recommendation: ApplicationDecision,
    justification: string,
  ): Observable<ApplicationResponse> {
    return this.api.post<ApplicationResponse, RecommendationRequest>(
      `/applications/${id}/recommend`,
      {
        recommendation,
        justification,
      },
    );
  }

  decide(
    id: string,
    decision: ApplicationDecision,
    justification: string,
  ): Observable<ApplicationResponse> {
    return this.api.post<ApplicationResponse, DecisionRequest>(`/applications/${id}/decide`, {
      decision,
      justification,
    });
  }
}
