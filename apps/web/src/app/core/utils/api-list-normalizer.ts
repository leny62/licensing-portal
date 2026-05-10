import { ApiListResponse, NormalizedList } from '../interfaces/api-list.interface';

export function normalizePagedResponse<T>(response: ApiListResponse<T>): NormalizedList<T> {
  if (Array.isArray(response)) {
    return {
      records: response,
      totalRecords: response.length,
      totalPages: 1,
    };
  }

  const envelopeData = response.data;
  const envelopeItems = 'items' in response ? response.items : undefined;
  const meta = 'meta' in response ? response.meta : undefined;

  if (Array.isArray(envelopeData) || Array.isArray(envelopeItems)) {
    const records = (envelopeData ?? envelopeItems ?? []) as T[];

    return {
      records,
      totalRecords: meta?.totalElements ?? meta?.total ?? records.length,
      totalPages: meta?.totalPages ?? 1,
    };
  }

  const pageData = envelopeData;
  const records = pageData?.content ?? pageData?.items ?? [];

  return {
    records,
    totalRecords: pageData?.totalElements ?? records.length,
    totalPages: pageData?.totalPages ?? 1,
  };
}
