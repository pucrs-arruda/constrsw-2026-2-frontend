import { BreakpointObserver } from '@angular/cdk/layout';
import {
  Component,
  computed,
  inject,
  input,
  output,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatTableModule } from '@angular/material/table';
import { map } from 'rxjs';

/** Compact &lt;600px → list (EXPERIENCE). */
const COMPACT_QUERY = '(max-width: 599.98px)';
/** Full columns only at ≥1280; below that hide `priority: low`. */
const FULL_COLUMNS_QUERY = '(min-width: 1280px)';

export type DataTableColumnPriority = 'high' | 'low';

export interface DataTableColumn {
  key: string;
  header: string;
  priority: DataTableColumnPriority;
}

export type DataTableRow = Record<string, unknown> & { id?: string | number };

@Component({
  selector: 'app-responsive-data-table',
  standalone: true,
  imports: [MatTableModule, MatButtonModule, MatIconModule, MatMenuModule],
  templateUrl: './responsive-data-table.html',
  styleUrl: './responsive-data-table.scss',
})
export class ResponsiveDataTable {
  private readonly breakpoints = inject(BreakpointObserver);

  readonly columns = input.required<readonly DataTableColumn[]>();
  readonly rows = input.required<readonly DataTableRow[]>();

  readonly showOpen = input(true);
  readonly showEdit = input(true);
  readonly showDelete = input(true);

  readonly openRow = output<DataTableRow>();
  readonly editRow = output<DataTableRow>();
  readonly deleteRow = output<DataTableRow>();

  readonly isCompact = toSignal(
    this.breakpoints.observe(COMPACT_QUERY).pipe(map((r) => r.matches)),
    { initialValue: this.breakpoints.isMatched(COMPACT_QUERY) },
  );

  readonly showLowPriority = toSignal(
    this.breakpoints.observe(FULL_COLUMNS_QUERY).pipe(map((r) => r.matches)),
    { initialValue: this.breakpoints.isMatched(FULL_COLUMNS_QUERY) },
  );

  readonly hasRowActions = computed(
    () => this.showOpen() || this.showEdit() || this.showDelete(),
  );

  readonly visibleColumns = computed(() => {
    const cols = this.columns();
    if (this.showLowPriority()) {
      return cols;
    }
    return cols.filter((c) => c.priority === 'high');
  });

  readonly displayedColumns = computed(() => {
    const keys = this.visibleColumns().map((c) => c.key);
    return this.hasRowActions() ? [...keys, 'actions'] : keys;
  });

  readonly highPriorityColumns = computed(() =>
    this.columns().filter((c) => c.priority === 'high'),
  );

  cellValue(row: DataTableRow, key: string): string {
    const value = row[key];
    if (value == null) {
      return '';
    }
    if (typeof value === 'object') {
      return '';
    }
    return String(value);
  }

  primaryLine(row: DataTableRow): string {
    const high = this.highPriorityColumns();
    const col = high[0] ?? this.columns()[0];
    return col ? this.cellValue(row, col.key) : '';
  }

  secondaryLine(row: DataTableRow): string {
    const high = this.highPriorityColumns();
    const cols = this.columns();
    const col = high[1] ?? cols.find((c) => c !== high[0]) ?? cols[1];
    return col ? this.cellValue(row, col.key) : '';
  }

  trackRow(index: number, row: DataTableRow): string {
    return `${String(row.id ?? 'row')}-${index}`;
  }

  onOpen(row: DataTableRow): void {
    this.openRow.emit(row);
  }

  onEdit(row: DataTableRow): void {
    this.editRow.emit(row);
  }

  onDelete(row: DataTableRow): void {
    this.deleteRow.emit(row);
  }
}
