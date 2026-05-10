import { HttpContext } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { of, throwError } from 'rxjs';

import { UserRole } from '../enums/user-role.enum';
import { ApiService } from './api.service';
import { AuthService } from './auth.service';

describe(AuthService.name, () => {
  const api = {
    post: jasmine.createSpy('post'),
    get: jasmine.createSpy('get'),
  };
  let router: jasmine.SpyObj<Router>;

  const successResponse = {
    accessToken: 'access',
    refreshToken: 'refresh',
    user: {
      id: 'user-1',
      email: 'applicant@licensing.local',
      role: UserRole.Applicant,
    },
  };

  beforeEach(() => {
    sessionStorage.clear();
    api.post.calls.reset();
    api.get.calls.reset();
    router = jasmine.createSpyObj<Router>('Router', ['navigateByUrl']);
    router.navigateByUrl.and.resolveTo(true);

    TestBed.configureTestingModule({
      providers: [
        AuthService,
        { provide: ApiService, useValue: api },
        { provide: Router, useValue: router },
      ],
    });
  });

  it('stores access token in memory and refresh token in session storage', () => {
    api.post.and.returnValue(of(successResponse));

    const service = TestBed.inject(AuthService);
    service.login({ email: 'applicant@licensing.local', password: 'LocalPass123!' }).subscribe();

    expect(service.accessToken).toBe('access');
    expect(service.currentUser()?.role).toBe(UserRole.Applicant);
    expect(sessionStorage.getItem('licensing.refreshToken')).toBe('refresh');
    expect(api.post.calls.mostRecent().args[2].context instanceof HttpContext).toBeTrue();
  });

  it('keeps MFA state when login requires a challenge', () => {
    api.post.and.returnValue(
      of({
        mfaRequired: true,
        mfaToken: 'mfa-token',
        user: {
          id: 'reviewer-1',
          email: 'reviewer@licensing.local',
          role: UserRole.Reviewer,
        },
      }),
    );

    const service = TestBed.inject(AuthService);
    service.login({ email: 'reviewer@licensing.local', password: 'LocalPass123!' }).subscribe();

    expect(service.pendingMfa()).toBeTrue();
    expect(service.mfaToken()).toBe('mfa-token');
    expect(service.accessToken).toBeNull();
  });

  it('completes MFA and clears pending challenge state', () => {
    const service = TestBed.inject(AuthService);
    api.post.and.returnValues(
      of({
        mfaRequired: true,
        mfaToken: 'mfa-token',
        user: {
          id: 'admin-1',
          email: 'admin@licensing.local',
          role: UserRole.Admin,
        },
      }),
      of({ ...successResponse, user: { ...successResponse.user, role: UserRole.Admin } }),
    );

    service.login({ email: 'admin@licensing.local', password: 'LocalPass123!' }).subscribe();
    service.completeMfa('LOCAL-RECOVERY-0001').subscribe();

    expect(service.pendingMfa()).toBeFalse();
    expect(service.mfaToken()).toBeNull();
    expect(service.currentUser()?.role).toBe(UserRole.Admin);
  });

  it('fails MFA completion when no MFA token is active', (done) => {
    const service = TestBed.inject(AuthService);

    service.completeMfa('123456').subscribe({
      error: (error: unknown) => {
        expect(error).toEqual(jasmine.any(Error));
        done();
      },
    });
  });

  it('refreshes an existing session from the stored refresh token', () => {
    sessionStorage.setItem('licensing.refreshToken', 'refresh');
    api.post.and.returnValue(of(successResponse));
    api.get.and.returnValue(
      of({
        ...successResponse.user,
        fullName: 'Aline Applicant',
        institutionName: 'Kigali Community Bank',
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }),
    );

    const service = TestBed.inject(AuthService);
    service.refreshSession().subscribe((token) => expect(token).toBe('access'));

    expect(service.accessToken).toBe('access');
    expect(service.currentUser()?.email).toBe('applicant@licensing.local');
    expect(api.get).toHaveBeenCalledWith('/me');
  });

  it('fails refresh when no refresh token exists', (done) => {
    const service = TestBed.inject(AuthService);

    service.refreshSession().subscribe({
      error: (error: unknown) => {
        expect(error).toEqual(jasmine.any(Error));
        done();
      },
    });
  });

  it('reports restore failure without throwing when refresh is unavailable', () => {
    const service = TestBed.inject(AuthService);

    service.restoreSession().subscribe((restored) => expect(restored).toBeFalse());
  });

  it('clears stored tokens when restore refresh fails', () => {
    sessionStorage.setItem('licensing.refreshToken', 'refresh');
    api.post.and.returnValue(throwError(() => new Error('refresh failed')));

    const service = TestBed.inject(AuthService);
    service.restoreSession().subscribe((restored) => expect(restored).toBeFalse());

    expect(sessionStorage.getItem('licensing.refreshToken')).toBeNull();
  });

  it('reports restore success when already authenticated', () => {
    api.post.and.returnValue(of(successResponse));
    const service = TestBed.inject(AuthService);
    service.login({ email: 'applicant@licensing.local', password: 'LocalPass123!' }).subscribe();

    service.restoreSession().subscribe((restored) => expect(restored).toBeTrue());
  });

  it('uses the Electron secure store hooks when available', () => {
    const secureStore = {
      get: jasmine.createSpy('get').and.resolveTo(null),
      set: jasmine.createSpy('set').and.resolveTo(undefined),
      delete: jasmine.createSpy('delete').and.resolveTo(undefined),
    };
    Object.defineProperty(window, 'electronAPI', {
      configurable: true,
      value: {
        version: '1.0.0',
        getAppVersion: () => Promise.resolve('1.0.0'),
        secureStore,
      },
    });
    api.post.and.returnValues(of(successResponse), of(undefined));

    const service = TestBed.inject(AuthService);
    service.login({ email: 'applicant@licensing.local', password: 'LocalPass123!' }).subscribe();
    service.logout().subscribe();

    expect(secureStore.set).toHaveBeenCalled();
    expect(secureStore.delete).toHaveBeenCalled();
    delete window.electronAPI;
  });

  it('logs out locally when no refresh token exists', () => {
    const service = TestBed.inject(AuthService);

    service.logout().subscribe();

    expect(router.navigateByUrl).toHaveBeenCalledWith('/login');
  });

  it('logs out through the API when a refresh token exists', () => {
    sessionStorage.setItem('licensing.refreshToken', 'refresh');
    api.post.and.returnValue(of(undefined));
    const service = TestBed.inject(AuthService);

    service.logout().subscribe();

    expect(api.post).toHaveBeenCalledWith(
      '/auth/logout',
      { refreshToken: 'refresh' },
      jasmine.any(Object),
    );
    expect(router.navigateByUrl).toHaveBeenCalledWith('/login');
  });

  it('proxies password changes through the auth endpoint', () => {
    api.post.and.returnValue(of(undefined));
    const service = TestBed.inject(AuthService);

    service
      .changePassword({ currentPassword: 'old-password', newPassword: 'new-password-123' })
      .subscribe();

    expect(api.post).toHaveBeenCalledWith('/auth/password', {
      currentPassword: 'old-password',
      newPassword: 'new-password-123',
    });
  });

  it('redirects to the current user role home', () => {
    api.post.and.returnValue(
      of({ ...successResponse, user: { ...successResponse.user, role: UserRole.Admin } }),
    );
    const service = TestBed.inject(AuthService);

    expect(service.deviceId).toBeTruthy();
    service.login({ email: 'admin@licensing.local', password: 'LocalPass123!' }).subscribe();
    service.redirectToRoleHome();

    expect(router.navigateByUrl).toHaveBeenCalledWith('/admin/users');
  });
});
