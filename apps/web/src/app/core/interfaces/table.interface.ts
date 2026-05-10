import { TemplateRef } from '@angular/core';

export type TableColumnType = 'text' | 'badge' | 'date' | 'action-menu' | 'custom';

export interface TableAction<T = unknown> {
  id: string;
  label: string;
  icon?: string;
  tone?: 'neutral' | 'primary' | 'danger' | 'success';
  visible?: (row: T) => boolean;
  disabled?: (row: T) => boolean;
}

export interface TableColumn<T = unknown> {
  key: keyof T & string;
  label: string;
  type?: TableColumnType;
  sortable?: boolean;
  template?: TemplateRef<unknown>;
  format?: (value: unknown, row: T) => string;
  actions?: TableAction<T>[];
}

export interface TableConfig<T = unknown> {
  columns: TableColumn<T>[];
  trackBy: keyof T & string;
  emptyTitle: string;
  emptyMessage: string;
  title?: string;
  searchPlaceholder?: string;
  filters?: TableFilterOption<T>[];
}

export interface TableActionEvent<T = unknown> {
  actionId: string;
  row: T;
}

export interface TablePagination {
  pageIndex: number;
  pageSize: number;
  length: number;
}

export interface TablePageEvent {
  pageNumber: number;
  pageSize: number;
}

export interface TableSortEvent {
  active: string;
  direction: 'asc' | 'desc' | '';
}

export interface TableFilterOption<T = unknown> {
  label: string;
  key: keyof T & string;
  options: Array<string | { label: string; value: unknown }>;
  predicate?: (row: T, selected: unknown) => boolean;
}
