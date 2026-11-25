import { BreakpointObserver } from '@angular/cdk/layout';
import {
  AfterViewInit,
  Component,
  ElementRef,
  OnInit,
  computed,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { Router } from '@angular/router';
import { forkJoin } from 'rxjs';
import {
  AlertBanner,
  DataTableColumn,
  DataTableRow,
  EmptyState,
  ResponsiveDataTable,
  SkeletonBlock,
  openConfirmDialog,
  openEditDialog,
} from '../../../shared/ui';
import { ClassesApiService } from '../data/classes-api.service';
import {
  ClassItem,
  ClassesLookups,
  UiErrorState,
  extractProblemUiError,
  formatClassStatus,
  formatCourseLabel,
  formatPeriod,
  formatRoomLabel,
} from '../data/classes.models';
import { ClassFormDialog, ClassFormDialogData } from './class-form.dialog';

interface ClassTableRow extends DataTableRow {
  id: string;
  code: string;
  courseLabel: string;
  periodLabel: string;
  roomLabel: string;
  statusLabel: string;
  raw: ClassItem;
}

@Component({
  selector: 'app-classes-list-page',
  standalone: true,
  imports: [
    MatButtonModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    AlertBanner,
    EmptyState,
    ResponsiveDataTable,
    SkeletonBlock,
  ],
  templateUrl: './classes-list.page.html',
  styleUrl: './classes-list.page.scss',
})
export class ClassesListPage implements OnInit, AfterViewInit {
  private readonly api = inject(ClassesApiService);
  private readonly router = inject(Router);
  private readonly dialog = inject(MatDialog);
  private readonly breakpoints = inject(BreakpointObserver);

  readonly headingEl = viewChild<ElementRef<HTMLHeadingElement>>('pageHeading');

  readonly loading = signal(true);
  readonly error = signal<UiErrorState | null>(null);
  readonly actionError = signal<UiErrorState | null>(null);
  readonly classes = signal<ClassItem[]>([]);
  readonly lookups = signal<ClassesLookups>({
    courses: [],
    professors: [],
    rooms: [],
  });
  readonly searchTerm = signal('');

  readonly columns: readonly DataTableColumn[] = [
    { key: 'code', header: 'Código', priority: 'high' },
    { key: 'courseLabel', header: 'Disciplina', priority: 'high' },
    { key: 'periodLabel', header: 'Período', priority: 'high' },
    { key: 'roomLabel', header: 'Sala padrão', priority: 'low' },
    { key: 'statusLabel', header: 'Situação', priority: 'low' },
  ];

  readonly rows = computed<ClassTableRow[]>(() => {
    const lk = this.lookups();
    const term = this.searchTerm().trim().toLowerCase();

    return this.classes()
      .map((item) => {
        const code = item.code?.trim() || item.label?.trim() || item.id.slice(0, 8);
        const courseLabel = formatCourseLabel(item.courseId, lk.courses);
        const periodLabel = formatPeriod(item.year, item.semester);
        const roomLabel = formatRoomLabel(item.roomId, lk.rooms);
        const statusLabel = formatClassStatus(item.status);
        return {
          id: item.id,
          code,
          courseLabel,
          periodLabel,
          roomLabel,
          statusLabel,
          raw: item,
        };
      })
      .filter((row) => {
        if (!term) {
          return true;
        }
        return [
          row.code,
          row.raw.label ?? '',
          row.courseLabel,
          row.periodLabel,
          row.roomLabel,
          row.statusLabel,
        ].some((field) => field.toLowerCase().includes(term));
      });
  });

  ngOnInit(): void {
    this.load();
  }

  ngAfterViewInit(): void {
    this.headingEl()?.nativeElement.focus();
  }

  load(): void {
    this.loading.set(true);
    this.error.set(null);
    this.actionError.set(null);

    forkJoin({
      classes: this.api.listClasses(),
      lookups: this.api.loadLookups(),
    }).subscribe({
      next: ({ classes, lookups }) => {
        this.classes.set(Array.isArray(classes) ? classes : []);
        this.lookups.set(lookups);
        this.loading.set(false);
      },
      error: (err) => {
        this.loading.set(false);
        this.error.set(
          extractProblemUiError(
            err,
            'Não foi possível carregar as turmas. Tente novamente.',
          ),
        );
      },
    });
  }

  onSearchInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.searchTerm.set(input.value);
  }

  clearSearch(): void {
    this.searchTerm.set('');
  }

  onCreate(): void {
    this.actionError.set(null);
    const ref = openEditDialog<ClassFormDialog, ClassFormDialogData, ClassItem | undefined>(
      this.dialog,
      ClassFormDialog,
      this.breakpoints,
      {
        data: {
          mode: 'create',
          lookups: this.lookups(),
        },
      },
    );

    ref.afterClosed().subscribe((created) => {
      if (created) {
        this.classes.update((list) => [created, ...list]);
      }
    });
  }

  onOpenRow(row: DataTableRow): void {
    const item = row as ClassTableRow;
    void this.router.navigate(['/turmas', item.id]);
  }

  onEditRow(row: DataTableRow): void {
    this.actionError.set(null);
    const item = row as ClassTableRow;
    const ref = openEditDialog<ClassFormDialog, ClassFormDialogData, ClassItem | undefined>(
      this.dialog,
      ClassFormDialog,
      this.breakpoints,
      {
        data: {
          mode: 'edit',
          classItem: item.raw,
          lookups: this.lookups(),
        },
      },
    );

    ref.afterClosed().subscribe((updated) => {
      if (updated) {
        this.classes.update((list) =>
          list.map((c) => (c.id === updated.id ? updated : c)),
        );
      }
    });
  }

  onDeleteRow(row: DataTableRow): void {
    this.actionError.set(null);
    const item = row as ClassTableRow;
    const ref = openConfirmDialog(
      this.dialog,
      {
        title: `Excluir turma ${item.code}?`,
        message:
          'A turma será desativada logicamente e deixará de aparecer nas listagens. Esta ação não pode ser desfeita na interface.',
        confirmLabel: 'Excluir turma',
        cancelLabel: 'Cancelar',
      },
      this.breakpoints,
    );

    ref.afterClosed().subscribe((confirmed) => {
      if (!confirmed) {
        return;
      }
      this.api.deleteClass(item.id).subscribe({
        next: () => {
          this.classes.update((list) => list.filter((c) => c.id !== item.id));
        },
        error: (err) => {
          this.actionError.set(
            extractProblemUiError(
              err,
              'Não foi possível excluir a turma. Tente novamente.',
            ),
          );
        },
      });
    });
  }
}
