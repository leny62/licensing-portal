import { HttpParams } from '@angular/common/http';

type QueryValue = string | number | boolean | null | undefined | QueryValue[];

export function buildHttpQueryParams(params?: object): HttpParams {
  let httpParams = new HttpParams();

  for (const [key, value] of Object.entries((params ?? {}) as Record<string, QueryValue>)) {
    if (value === undefined || value === null || value === '') continue;
    if (Array.isArray(value)) {
      for (const item of value) {
        if (item !== undefined && item !== null && item !== '') {
          httpParams = httpParams.append(key, String(item));
        }
      }
    } else {
      httpParams = httpParams.set(key, String(value));
    }
  }

  return httpParams;
}
