import { HttpClient, HttpContext } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import '../interfaces/electron.interface';
import { buildHttpQueryParams } from '../utils/http-query-params';

export interface RequestOptions {
  params?: object;
  context?: HttpContext;
}

@Injectable({ providedIn: 'root' })
export class ApiService {
  private readonly baseUrl = '/api/v1';

  constructor(private readonly http: HttpClient) {}

  get<T>(path: string, options: RequestOptions = {}): Observable<T> {
    return this.http.get<T>(this.url(path), {
      params: buildHttpQueryParams(options.params),
      context: options.context,
    });
  }

  post<T, B = unknown>(path: string, body?: B, options: RequestOptions = {}): Observable<T> {
    return this.http.post<T>(this.url(path), body ?? {}, {
      params: buildHttpQueryParams(options.params),
      context: options.context,
    });
  }

  patch<T, B = unknown>(path: string, body: B, options: RequestOptions = {}): Observable<T> {
    return this.http.patch<T>(this.url(path), body, {
      params: buildHttpQueryParams(options.params),
      context: options.context,
    });
  }

  delete<T>(path: string, options: RequestOptions = {}): Observable<T> {
    return this.http.delete<T>(this.url(path), {
      params: buildHttpQueryParams(options.params),
      context: options.context,
    });
  }

  download(path: string, options: RequestOptions = {}): Observable<Blob> {
    return this.http.get(this.url(path), {
      params: buildHttpQueryParams(options.params),
      context: options.context,
      responseType: 'blob',
    });
  }

  isElectron(): boolean {
    return window.electronAPI !== undefined;
  }

  private url(path: string): string {
    return `${this.baseUrl}${path.startsWith('/') ? path : `/${path}`}`;
  }
}
