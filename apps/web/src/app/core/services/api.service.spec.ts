import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { ApiService } from './api.service';

describe(ApiService.name, () => {
  let service: ApiService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [ApiService, provideHttpClient(), provideHttpClientTesting()],
    });

    service = TestBed.inject(ApiService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify();
  });

  it('prepends the API prefix and removes empty query values', () => {
    service.get<{ ok: boolean }>('/users', { params: { role: 'ADMIN', q: '' } }).subscribe();

    const request = http.expectOne('/api/v1/users?role=ADMIN');
    expect(request.request.method).toBe('GET');
    request.flush({ ok: true });
  });

  it('serialises array params as repeated keys', () => {
    service
      .get('/applications', {
        params: { state: ['RECOMMENDED_FOR_APPROVAL', 'RECOMMENDED_FOR_REJECTION'] },
      })
      .subscribe();

    const request = http.expectOne(
      '/api/v1/applications?state=RECOMMENDED_FOR_APPROVAL&state=RECOMMENDED_FOR_REJECTION',
    );
    expect(request.request.params.getAll('state')).toEqual([
      'RECOMMENDED_FOR_APPROVAL',
      'RECOMMENDED_FOR_REJECTION',
    ]);
    request.flush([]);
  });

  it('accepts paths without a leading slash and empty bodies', () => {
    service.get('me').subscribe();
    http.expectOne('/api/v1/me').flush({});

    service.post('auth/logout').subscribe();
    const logout = http.expectOne('/api/v1/auth/logout');
    expect(logout.request.body).toEqual({});
    logout.flush({});
  });

  it('posts and patches through HttpClient', () => {
    service.post('/users', { email: 'new.user@licensing.local' }).subscribe();
    http.expectOne('/api/v1/users').flush({});

    service.patch('/users/user-1', { fullName: 'Updated User' }).subscribe();
    const patch = http.expectOne('/api/v1/users/user-1');
    expect(patch.request.method).toBe('PATCH');
    patch.flush({});
  });

  it('downloads as a blob', () => {
    service.download('/documents/doc-1/download').subscribe();

    const request = http.expectOne('/api/v1/documents/doc-1/download');
    expect(request.request.method).toBe('GET');
    expect(request.request.responseType).toBe('blob');
    request.flush(new Blob(['%PDF-1.4'], { type: 'application/pdf' }));
  });

  it('detects Electron from the preload bridge', () => {
    expect(service.isElectron()).toBeFalse();

    Object.defineProperty(window, 'electronAPI', {
      configurable: true,
      value: {
        version: '1.0.0',
        getAppVersion: () => Promise.resolve('1.0.0'),
        secureStore: {
          get: () => Promise.resolve(null),
          set: () => Promise.resolve(),
          delete: () => Promise.resolve(),
        },
      },
    });

    expect(service.isElectron()).toBeTrue();
    delete window.electronAPI;
  });
});
