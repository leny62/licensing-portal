import { HttpInterceptorFn } from '@angular/common/http';

export const correlationInterceptor: HttpInterceptorFn = (request, next) => {
  return next(
    request.clone({
      setHeaders: {
        'X-Correlation-Id': crypto.randomUUID(),
      },
    }),
  );
};
