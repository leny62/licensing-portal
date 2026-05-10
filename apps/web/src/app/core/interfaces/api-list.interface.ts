export interface ApiListMeta {
  page?: number;
  size?: number;
  total?: number;
  totalElements?: number;
  totalPages?: number;
}

export interface ApiListEnvelope<T> {
  success?: boolean;
  message?: string;
  data?: T[];
  items?: T[];
  meta?: ApiListMeta;
}

export interface ApiPageDataEnvelope<T> {
  data?: {
    content?: T[];
    items?: T[];
    totalElements?: number;
    totalPages?: number;
    page?: number;
    size?: number;
  };
}

export interface NormalizedList<T> {
  records: T[];
  totalRecords: number;
  totalPages: number;
}

export type ApiListResponse<T> = T[] | ApiListEnvelope<T> | ApiPageDataEnvelope<T>;
