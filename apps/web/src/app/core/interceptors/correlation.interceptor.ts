import { HttpInterceptorFn } from '@angular/common/http';

import { browserId } from '../utils/browser-id';

export const correlationInterceptor: HttpInterceptorFn = (request, next) => {
  return next(
    request.clone({
      setHeaders: {
        'X-Correlation-Id': browserId(),
      },
    }),
  );
};
