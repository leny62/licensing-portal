import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { ApplicationDecision } from '../enums/application-decision.enum';
import { ApiListResponse } from '../interfaces/api-list.interface';
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
import { ComplianceChecklistResponse } from '../interfaces/compliance-checklist.interface';
import {
  ApplicationDecisionRecordResponse,
  ApplicationFeeResponse,
  ApplicationSlaClockResponse,
  CapitalDeclarationResponse,
  ComplianceFindingRecordResponse,
  DocumentSlotSpecResponse,
  InformationLetterResponse,
  IssueInformationLetterRequest,
  MarkShareholderFitAndProperRequest,
  SaveSeniorManagerRequest,
  SaveSignificantShareholderRequest,
  SeniorManagerResponse,
  SignificantShareholderResponse,
  SubmitFeeProofRequest,
  UpsertCapitalDeclarationRequest,
} from '../interfaces/regulatory.interface';
import { ApiService } from './api.service';

@Injectable({ providedIn: 'root' })
export class ApplicationsService {
  constructor(private readonly api: ApiService) {}

  list(query: ListApplicationsQuery = {}): Observable<ApiListResponse<ApplicationResponse>> {
    return this.api.get<ApiListResponse<ApplicationResponse>>('/applications', { params: query });
  }

  get(id: string): Observable<ApplicationResponse> {
    return this.api.get<ApplicationResponse>(`/applications/${id}`);
  }

  compliance(id: string): Observable<ComplianceChecklistResponse> {
    return this.api.get<ComplianceChecklistResponse>(`/applications/${id}/compliance`);
  }

  capitalDeclaration(id: string): Observable<CapitalDeclarationResponse | null> {
    return this.api.get<CapitalDeclarationResponse | null>(
      `/applications/${id}/capital-declaration`,
    );
  }

  saveCapitalDeclaration(
    id: string,
    body: UpsertCapitalDeclarationRequest,
  ): Observable<CapitalDeclarationResponse> {
    return this.api.post<CapitalDeclarationResponse, UpsertCapitalDeclarationRequest>(
      `/applications/${id}/capital-declaration`,
      body,
    );
  }

  shareholders(id: string): Observable<SignificantShareholderResponse[]> {
    return this.api.get<SignificantShareholderResponse[]>(`/applications/${id}/shareholders`);
  }

  createShareholder(
    id: string,
    body: SaveSignificantShareholderRequest,
  ): Observable<SignificantShareholderResponse> {
    return this.api.post<SignificantShareholderResponse, SaveSignificantShareholderRequest>(
      `/applications/${id}/shareholders`,
      body,
    );
  }

  updateShareholder(
    id: string,
    shareholderId: string,
    body: Partial<SaveSignificantShareholderRequest>,
  ): Observable<SignificantShareholderResponse> {
    return this.api.patch<
      SignificantShareholderResponse,
      Partial<SaveSignificantShareholderRequest>
    >(`/applications/${id}/shareholders/${shareholderId}`, body);
  }

  deleteShareholder(id: string, shareholderId: string): Observable<void> {
    return this.api.delete<void>(`/applications/${id}/shareholders/${shareholderId}`);
  }

  markShareholderFitAndProper(
    id: string,
    shareholderId: string,
    body: MarkShareholderFitAndProperRequest,
  ): Observable<SignificantShareholderResponse> {
    return this.api.patch<SignificantShareholderResponse, MarkShareholderFitAndProperRequest>(
      `/applications/${id}/shareholders/${shareholderId}/fit-and-proper`,
      body,
    );
  }

  seniorManagers(id: string): Observable<SeniorManagerResponse[]> {
    return this.api.get<SeniorManagerResponse[]>(`/applications/${id}/senior-managers`);
  }

  createSeniorManager(
    id: string,
    body: SaveSeniorManagerRequest,
  ): Observable<SeniorManagerResponse> {
    return this.api.post<SeniorManagerResponse, SaveSeniorManagerRequest>(
      `/applications/${id}/senior-managers`,
      body,
    );
  }

  updateSeniorManager(
    id: string,
    seniorManagerId: string,
    body: Partial<SaveSeniorManagerRequest>,
  ): Observable<SeniorManagerResponse> {
    return this.api.patch<SeniorManagerResponse, Partial<SaveSeniorManagerRequest>>(
      `/applications/${id}/senior-managers/${seniorManagerId}`,
      body,
    );
  }

  deleteSeniorManager(id: string, seniorManagerId: string): Observable<void> {
    return this.api.delete<void>(`/applications/${id}/senior-managers/${seniorManagerId}`);
  }

  documentSlotSpecs(id: string): Observable<DocumentSlotSpecResponse[]> {
    return this.api.get<DocumentSlotSpecResponse[]>(`/applications/${id}/document-slot-specs`);
  }

  permittedActivities(id: string): Observable<string[]> {
    return this.api.get<string[]>(`/applications/${id}/permitted-activities`);
  }

  complianceFindings(id: string): Observable<ComplianceFindingRecordResponse[]> {
    return this.api.get<ComplianceFindingRecordResponse[]>(
      `/applications/${id}/compliance-findings`,
    );
  }

  decisions(id: string): Observable<ApplicationDecisionRecordResponse[]> {
    return this.api.get<ApplicationDecisionRecordResponse[]>(`/applications/${id}/decisions`);
  }

  informationLetters(id: string): Observable<InformationLetterResponse[]> {
    return this.api.get<InformationLetterResponse[]>(`/applications/${id}/information-letters`);
  }

  issueInformationLetter(
    id: string,
    body: IssueInformationLetterRequest,
  ): Observable<InformationLetterResponse> {
    return this.api.post<InformationLetterResponse, IssueInformationLetterRequest>(
      `/applications/${id}/information-letters`,
      body,
    );
  }

  downloadInformationLetter(id: string, letterId: string): Observable<Blob> {
    return this.api.download(`/applications/${id}/information-letters/${letterId}/pdf`);
  }

  fee(id: string): Observable<ApplicationFeeResponse | null> {
    return this.api.get<ApplicationFeeResponse | null>(`/applications/${id}/fees`);
  }

  submitFeeProof(id: string, body: SubmitFeeProofRequest): Observable<ApplicationFeeResponse> {
    return this.api.post<ApplicationFeeResponse, SubmitFeeProofRequest>(
      `/applications/${id}/fees/proof`,
      body,
    );
  }

  slaClocks(id: string): Observable<ApplicationSlaClockResponse[]> {
    return this.api.get<ApplicationSlaClockResponse[]>(`/applications/${id}/sla-clocks`);
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

  decide(id: string, payload: DecisionRequest): Observable<ApplicationResponse> {
    return this.api.post<ApplicationResponse, DecisionRequest>(
      `/applications/${id}/decide`,
      payload,
    );
  }
}
