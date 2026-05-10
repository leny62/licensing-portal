import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, switchMap, throwError } from 'rxjs';

import { AuthService } from '../services/auth.service';
import { NotifyService } from '../services/notify.service';
import { SKIP_REFRESH } from './http-context';

export const errorInterceptor: HttpInterceptorFn = (request, next) => {
  const auth = inject(AuthService);
  const notify = inject(NotifyService);
  const router = inject(Router);

  return next(request).pipe(
    catchError((error: unknown) => {
      if (!(error instanceof HttpErrorResponse)) {
        return throwError(() => error);
      }

      if (
        error.status === 401 &&
        !request.context.get(SKIP_REFRESH) &&
        auth.getStoredRefreshToken() !== null
      ) {
        return auth.refreshSession().pipe(
          switchMap((token) =>
            next(
              request.clone({
                setHeaders: {
                  Authorization: `Bearer ${token}`,
                },
              }),
            ),
          ),
          catchError((refreshError: unknown) => {
            void router.navigateByUrl('/login');
            return throwError(() => refreshError);
          }),
        );
      }

      if (error.status === 403) {
        notify.error('You do not have access to this action.');
      }

      if (error.status === 409) {
        notify.warning('This application has changed. Please refresh.');
      }

      return throwError(() => error);
    }),
  );
};
