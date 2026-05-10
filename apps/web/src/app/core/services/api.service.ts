import { HttpClient, HttpContext, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import '../interfaces/electron.interface';

type QueryValue = string | number | boolean | null | undefined;

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
      params: this.params(options.params),
      context: options.context,
    });
  }

  post<T, B = unknown>(path: string, body?: B, options: RequestOptions = {}): Observable<T> {
    return this.http.post<T>(this.url(path), body ?? {}, {
      params: this.params(options.params),
      context: options.context,
    });
  }

  patch<T, B = unknown>(path: string, body: B, options: RequestOptions = {}): Observable<T> {
    return this.http.patch<T>(this.url(path), body, {
      params: this.params(options.params),
      context: options.context,
    });
  }

  isElectron(): boolean {
    return window.electronAPI !== undefined;
  }

  private url(path: string): string {
    return `${this.baseUrl}${path.startsWith('/') ? path : `/${path}`}`;
  }

  private params(params?: object): HttpParams {
    let httpParams = new HttpParams();

    for (const [key, value] of Object.entries((params ?? {}) as Record<string, QueryValue>)) {
      if (value !== undefined && value !== null && value !== '') {
        httpParams = httpParams.set(key, String(value));
      }
    }

    return httpParams;
  }
}
