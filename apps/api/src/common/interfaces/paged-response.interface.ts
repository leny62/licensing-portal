export interface PagedMeta {
  page: number;
  size: number;
  total: number;
  totalPages: number;
}

export interface PagedResponse<T> {
  data: T[];
  meta: PagedMeta;
}
