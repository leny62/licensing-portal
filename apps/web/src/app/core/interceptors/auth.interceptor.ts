import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';

import { AuthService } from '../services/auth.service';
import { SKIP_AUTH } from './http-context';

export const authInterceptor: HttpInterceptorFn = (request, next) => {
  if (request.context.get(SKIP_AUTH)) {
    return next(request);
  }

  const token = inject(AuthService).accessToken;

  if (token === null) {
    return next(request);
  }

  return next(
    request.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`,
      },
    }),
  );
};
