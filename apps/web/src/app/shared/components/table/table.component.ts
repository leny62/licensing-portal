import { NgClass } from '@angular/common';
import {
  Component,
  DestroyRef,
  EventEmitter,
  Input,
  OnChanges,
  Output,
  SimpleChanges,
  inject,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { PageEvent, MatPaginatorModule } from '@angular/material/paginator';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Subject, debounceTime, distinctUntilChanged } from 'rxjs';

import {
  TableAction,
  TableActionEvent,
  TableColumn,
  TableConfig,
  TableFilterOption,
  TablePageEvent,
} from '../../../core/interfaces/table.interface';
import { formatDateTime } from '../../../core/utils/application-view.mapper';
import { EmptyStateComponent } from '../empty-state/empty-state.component';
import { LoadingStateComponent } from '../loading-state/loading-state.component';
import { StatusBadgeComponent } from '../status-badge/status-badge.component';

/**
 * Server-driven table. All filtering and search happens at the API layer.
 * The component emits events; the parent owns the API call and updates [data].
 * Pagination of the current [data] page is done client-side to avoid the
 * round-trip cost for in-memory slicing — swap to a pageChange handler plus
 * totalRecords input when backend pagination is wired.
 */
@Component({
  selector: 'app-table',
  standalone: true,
  imports: [
    EmptyStateComponent,
    LoadingStateComponent,
    MatButtonModule,
    MatIconModule,
    MatMenuModule,
    MatPaginatorModule,
    MatTableModule,
    MatTooltipModule,
    NgClass,
    StatusBadgeComponent,
  ],
  templateUrl: './table.component.html',
  styleUrl: './table.component.scss',
})
export class TableComponent<T extends object> implements OnChanges {
  private readonly destroyRef = inject(DestroyRef);
  private readonly searchSubject = new Subject<string>();

  @Input({ required: true }) config!: TableConfig<T>;
  @Input() data: T[] = [];
  @Input() isLoading = false;
  @Input() showSearch = true;
  @Input() showFilter = true;
  @Input() searchDebounceTime = 350;
  @Input() pageSize = 10;
  @Input() totalRecords = 0;
  @Input() totalPages = 0;
  @Input() filterOptions: TableFilterOption<T>[] = [];
  @Input() showEmptyAction = false;
  @Input() emptyActionLabel = 'Refresh';

  @Output() actionClick = new EventEmitter<TableActionEvent<T>>();
  @Output() searchChange = new EventEmitter<string>();
  @Output() filtersChange = new EventEmitter<Record<string, unknown>>();
  @Output() pageChange = new EventEmitter<TablePageEvent>();
  @Output() emptyActionClick = new EventEmitter<void>();

  searchTerm = '';
  selectedFilters: Record<string, unknown> = {};
  currentPageIndex = 0;
  currentPageSize = 10;

  constructor() {
    this.searchSubject
      .pipe(debounceTime(this.searchDebounceTime), distinctUntilChanged(), takeUntilDestroyed(this.destroyRef))
      .subscribe((term) => this.searchChange.emit(term));
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['pageSize']) {
      this.currentPageSize = this.pageSize;
    }
  }

  displayedColumns(): string[] {
    return this.config.columns.map((c) => c.key);
  }

  toolbarVisible(): boolean {
    return this.showSearch || (this.showFilter && this.filters().length > 0) || Boolean(this.config.title);
  }

  filters(): TableFilterOption<T>[] {
    return this.filterOptions.length > 0 ? this.filterOptions : (this.config.filters ?? []);
  }

  visibleData(): T[] {
    const start = this.currentPageIndex * this.currentPageSize;
    return this.data.slice(start, start + this.currentPageSize);
  }

  totalLength(): number {
    return this.totalRecords > 0 ? this.totalRecords : this.data.length;
  }

  totalPageCount(): number {
    if (this.totalPages > 0) return this.totalPages;
    return Math.max(Math.ceil(this.totalLength() / this.currentPageSize), 1);
  }

  value(row: T, column: TableColumn<T>): unknown {
    return (row as Record<string, unknown>)[column.key];
  }

  text(row: T, column: TableColumn<T>): string {
    const raw = this.value(row, column);
    if (column.format !== undefined) return column.format(raw, row);
    if (raw === null || raw === undefined || raw === '') return '—';
    return String(raw);
  }

  date(row: T, column: TableColumn<T>): string {
    const raw = this.value(row, column);
    return typeof raw === 'string' ? formatDateTime(raw) : '—';
  }

  actions(row: T, column: TableColumn<T>): TableAction<T>[] {
    return (column.actions ?? []).filter((a) => a.visible?.(row) ?? true);
  }

  actionToneClass(action: TableAction<T>): string {
    return `action-${action.tone ?? 'neutral'}`;
  }

  disabled(row: T, action: TableAction<T>): boolean {
    return action.disabled?.(row) ?? false;
  }

  trackByRow(_: number, row: T): unknown {
    return (row as Record<string, unknown>)[this.config.trackBy];
  }

  handleSearch(value: string): void {
    this.searchTerm = value;
    this.currentPageIndex = 0;
    this.searchSubject.next(value.trim());
  }

  clearSearch(): void {
    this.searchTerm = '';
    this.currentPageIndex = 0;
    this.searchChange.emit('');
  }

  selectFilter(key: string, value: unknown): void {
    this.selectedFilters = { ...this.selectedFilters, [key]: value };
    this.currentPageIndex = 0;
    this.filtersChange.emit(this.selectedFilters);
  }

  clearFilter(key: string): void {
    const next = { ...this.selectedFilters };
    delete next[key];
    this.selectedFilters = next;
    this.currentPageIndex = 0;
    this.filtersChange.emit(this.selectedFilters);
  }

  clearAllControls(): void {
    this.searchTerm = '';
    this.selectedFilters = {};
    this.currentPageIndex = 0;
    this.searchChange.emit('');
    this.filtersChange.emit({});
  }

  activeFilterCount(): number {
    return Object.keys(this.selectedFilters).length;
  }

  selectedFilterLabel(filterOption: TableFilterOption<T>): string {
    const selected = this.selectedFilters[filterOption.key];
    if (selected === undefined) return filterOption.label;
    const option = filterOption.options.find((c) =>
      typeof c === 'string' ? c === selected : c.value === selected,
    );
    if (typeof option === 'string') return option;
    return option?.label ?? String(selected);
  }

  optionLabel(option: string | { label: string; value: unknown }): string {
    return typeof option === 'string' ? option : option.label;
  }

  optionValue(option: string | { label: string; value: unknown }): unknown {
    return typeof option === 'string' ? option : option.value;
  }

  handlePage(event: PageEvent): void {
    this.currentPageIndex = event.pageIndex;
    this.currentPageSize = event.pageSize;
    this.pageChange.emit({ pageNumber: event.pageIndex + 1, pageSize: event.pageSize });
  }

  hasActiveControls(): boolean {
    return this.searchTerm.trim().length > 0 || this.activeFilterCount() > 0;
  }
}
