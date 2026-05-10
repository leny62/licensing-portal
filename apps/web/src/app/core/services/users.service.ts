import { Injectable } from '@angular/core';
import { Observable, map } from 'rxjs';

import { ApiListResponse, NormalizedList } from '../interfaces/api-list.interface';
import {
  CreateUserRequest,
  ListUsersQuery,
  UpdateUserRequest,
  UserResponse,
} from '../interfaces/user.interface';
import { normalizePagedResponse } from '../utils/api-list-normalizer';
import { ApiService } from './api.service';

@Injectable({ providedIn: 'root' })
export class UsersService {
  constructor(private readonly api: ApiService) {}

  me(): Observable<UserResponse> {
    return this.api.get<UserResponse>('/me');
  }

  list(query: ListUsersQuery = {}): Observable<NormalizedList<UserResponse>> {
    return this.api
      .get<ApiListResponse<UserResponse>>('/users', { params: query })
      .pipe(map((response) => normalizePagedResponse(response)));
  }

  create(body: CreateUserRequest): Observable<UserResponse> {
    return this.api.post<UserResponse, CreateUserRequest>('/users', body);
  }

  update(id: string, body: UpdateUserRequest): Observable<UserResponse> {
    return this.api.patch<UserResponse, UpdateUserRequest>(`/users/${id}`, body);
  }

  deactivate(id: string): Observable<UserResponse> {
    return this.api.post<UserResponse>(`/users/${id}/deactivate`);
  }

  reactivate(id: string): Observable<UserResponse> {
    return this.api.post<UserResponse>(`/users/${id}/reactivate`);
  }
}
