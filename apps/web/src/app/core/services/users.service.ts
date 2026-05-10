import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { ApiListResponse } from '../interfaces/api-list.interface';
import {
  CreateUserRequest,
  ListUsersQuery,
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
