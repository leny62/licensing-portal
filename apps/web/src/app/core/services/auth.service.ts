import { HttpContext } from '@angular/common/http';
import { Injectable, computed, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, catchError, map, of, switchMap, tap, throwError } from 'rxjs';

import {
  ChangePasswordRequest,
  LoginRequest,
  LoginResponse,
  LoginSuccessResponse,
  MfaChallengeRequest,
  RefreshRequest,
  TokenPair,
} from '../interfaces/auth.interface';
import { AuthenticatedUser, UserResponse } from '../interfaces/user.interface';
import { roleHome } from '../utils/role-home';
import { ApiService } from './api.service';
import { SKIP_AUTH, SKIP_REFRESH } from '../interceptors/http-context';
import '../interfaces/electron.interface';

const REFRESH_TOKEN_KEY = 'licensing.refreshToken';
const DEVICE_ID_KEY = 'licensing.deviceId';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly accessTokenSignal = signal<string | null>(null);
  private readonly currentUserSignal = signal<AuthenticatedUser | null>(null);
  readonly pendingMfa = signal(false);
  readonly mfaToken = signal<string | null>(null);
  readonly isAuthenticated = computed(() => this.accessTokenSignal() !== null);
  readonly currentUser = computed(() => this.currentUserSignal());

  constructor(
    private readonly api: ApiService,
    private readonly router: Router,
  ) {
    this.ensureDeviceId();
  }

  get accessToken(): string | null {
    return this.accessTokenSignal();
  }

  get deviceId(): string {
    return this.ensureDeviceId();
  }

  login(request: Omit<LoginRequest, 'deviceId'>): Observable<LoginResponse> {
    const body: LoginRequest = { ...request, deviceId: this.deviceId };

    return this.api
      .post<LoginResponse, LoginRequest>('/auth/login', body, {
        context: this.publicContext(),
      })
      .pipe(
        tap((response) => {
          if ('mfaRequired' in response) {
            this.pendingMfa.set(true);
            this.mfaToken.set(response.mfaToken);
            this.currentUserSignal.set(response.user);
            return;
          }

          this.establishSession(response);
        }),
      );
  }

  completeMfa(code: string): Observable<LoginSuccessResponse> {
    const token = this.mfaToken();

    if (token === null) {
      return throwError(() => new Error('MFA session has expired.'));
    }

    const body: MfaChallengeRequest = {
      mfaToken: token,
      code,
      deviceId: this.deviceId,
    };

    return this.api
      .post<LoginSuccessResponse, MfaChallengeRequest>('/auth/mfa/challenge', body, {
        context: this.publicContext(),
      })
      .pipe(tap((response) => this.establishSession(response)));
  }

  refreshSession(): Observable<string> {
    const refreshToken = this.getStoredRefreshToken();

    if (refreshToken === null) {
      return throwError(() => new Error('No refresh token is available.'));
    }

    const body: RefreshRequest = { refreshToken, deviceId: this.deviceId };

    return this.api
      .post<TokenPair, RefreshRequest>('/auth/refresh', body, {
        context: this.publicContext(),
      })
      .pipe(
        tap((response) => this.establishTokens(response)),
        switchMap((response) =>
          this.api.get<UserResponse>('/me').pipe(
            tap((user) => this.currentUserSignal.set(this.toAuthenticatedUser(user))),
            map(() => response.accessToken),
          ),
        ),
      );
  }

  restoreSession(): Observable<boolean> {
    if (this.isAuthenticated()) {
      return of(true);
    }

    if (this.getStoredRefreshToken() === null) {
      return of(false);
    }

    return this.refreshSession().pipe(
      map(() => true),
      catchError(() => {
        this.clearSession();
        return of(false);
      }),
    );
  }

  logout(): Observable<void> {
    const refreshToken = this.getStoredRefreshToken();

    if (refreshToken === null) {
      this.clearSession();
      void this.router.navigateByUrl('/login');
      return of(undefined);
    }

    return this.api
      .post<void, { refreshToken: string }>(
        '/auth/logout',
        { refreshToken },
        {
          context: this.publicContext(),
        },
      )
      .pipe(
        catchError(() => of(undefined)),
        tap(() => {
          this.clearSession();
          void this.router.navigateByUrl('/login');
        }),
      );
  }

  changePassword(body: ChangePasswordRequest): Observable<void> {
    return this.api.post<void, ChangePasswordRequest>('/auth/password', body);
  }

  redirectToRoleHome(): void {
    const user = this.currentUser();
    void this.router.navigateByUrl(user === null ? '/login' : roleHome(user.role));
  }

  getStoredRefreshToken(): string | null {
    return sessionStorage.getItem(REFRESH_TOKEN_KEY);
  }

  private establishSession(response: LoginSuccessResponse): void {
    this.establishTokens(response);
    this.currentUserSignal.set(response.user);
    this.pendingMfa.set(false);
    this.mfaToken.set(null);
  }

  private establishTokens(response: TokenPair): void {
    this.accessTokenSignal.set(response.accessToken);
    this.storeRefreshToken(response.refreshToken);
  }

  private toAuthenticatedUser(user: UserResponse): AuthenticatedUser {
    return {
      id: user.id,
      email: user.email,
      role: user.role,
    };
  }

  private storeRefreshToken(token: string): void {
    sessionStorage.setItem(REFRESH_TOKEN_KEY, token);

    if (window.electronAPI !== undefined) {
      void window.electronAPI.secureStore.set(REFRESH_TOKEN_KEY, token);
    }
  }

  private clearSession(): void {
    this.accessTokenSignal.set(null);
    this.currentUserSignal.set(null);
    this.pendingMfa.set(false);
    this.mfaToken.set(null);
    sessionStorage.removeItem(REFRESH_TOKEN_KEY);

    if (window.electronAPI !== undefined) {
      void window.electronAPI.secureStore.delete(REFRESH_TOKEN_KEY);
    }
  }

  private ensureDeviceId(): string {
    const existing = sessionStorage.getItem(DEVICE_ID_KEY);

    if (existing !== null) {
      return existing;
    }

    const id = crypto.randomUUID();
    sessionStorage.setItem(DEVICE_ID_KEY, id);
    return id;
  }

  private publicContext(): HttpContext {
    return new HttpContext().set(SKIP_AUTH, true).set(SKIP_REFRESH, true);
  }
}
