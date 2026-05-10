import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { ApiListResponse } from '../interfaces/api-list.interface';
import {
  CreateUserRequest,
  ListUsersQuery,
  ResetUserPasswordRequest,
  UpdateUserRequest,
  UserResponse,
} from '../interfaces/user.interface';
import { ApiService } from './api.service';

@Injectable({ providedIn: 'root' })
export class UsersService {
  constructor(private readonly api: ApiService) {}

  me(): Observable<UserResponse> {
    return this.api.get<UserResponse>('/me');
  }

  list(query: ListUsersQuery = {}): Observable<ApiListResponse<UserResponse>> {
    return this.api.get<ApiListResponse<UserResponse>>('/users', { params: query });
  }

  get(id: string): Observable<UserResponse> {
    return this.api.get<UserResponse>(`/users/${id}`);
  }

  create(body: CreateUserRequest): Observable<UserResponse> {
    return this.api.post<UserResponse, CreateUserRequest>('/users', body);
  }

  update(id: string, body: UpdateUserRequest): Observable<UserResponse> {
    return this.api.patch<UserResponse, UpdateUserRequest>(`/users/${id}`, body);
  }

  resetPassword(id: string, body: ResetUserPasswordRequest): Observable<void> {
    return this.api.post<void, ResetUserPasswordRequest>(`/users/${id}/password`, body);
  }

  deactivate(id: string): Observable<UserResponse> {
    return this.api.post<UserResponse>(`/users/${id}/deactivate`);
  }

  reactivate(id: string): Observable<UserResponse> {
    return this.api.post<UserResponse>(`/users/${id}/reactivate`);
  }
}
