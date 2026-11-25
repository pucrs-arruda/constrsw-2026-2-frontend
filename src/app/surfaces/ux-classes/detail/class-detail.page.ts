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
import { MatIconModule } from '@angular/material/icon';
import { MatTabsModule } from '@angular/material/tabs';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import {
  AlertBanner,
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
  formatProfessorLabel,
  formatRoomLabel,
} from '../data/classes.models';
import { ClassFormDialog, ClassFormDialogData } from '../list/class-form.dialog';
import { ClassEnrollmentsTab } from './class-enrollments-tab';

const TAB_KEYS = ['alunos', 'aulas', 'reservas'] as const;
type TabKey = (typeof TAB_KEYS)[number];

@Component({
  selector: 'app-class-detail-page',
  standalone: true,
  imports: [
    RouterLink,
    MatButtonModule,
    MatIconModule,
    MatTabsModule,
    AlertBanner,
    SkeletonBlock,
    ClassEnrollmentsTab,
  ],
  templateUrl: './class-detail.page.html',
  styleUrl: './class-detail.page.scss',
})
export class ClassDetailPage implements OnInit, AfterViewInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly api = inject(ClassesApiService);
  private readonly dialog = inject(MatDialog);
  private readonly breakpoints = inject(BreakpointObserver);

  readonly headingEl = viewChild<ElementRef<HTMLHeadingElement>>('detailHeading');

  readonly loading = signal(true);
  readonly error = signal<UiErrorState | null>(null);
  readonly actionError = signal<UiErrorState | null>(null);
  readonly classItem = signal<ClassItem | null>(null);
  readonly lookups = signal<ClassesLookups>({
    courses: [],
    professors: [],
    rooms: [],
  });
  readonly selectedTabIndex = signal(0);

  readonly classCode = computed(() => {
    const item = this.classItem();
    if (!item) {
      return '';
    }
    return item.code?.trim() || item.label?.trim() || item.id.slice(0, 8);
  });

  readonly courseTitle = computed(() => {
    const item = this.classItem();
    if (!item) {
      return '';
    }
    return formatCourseLabel(item.courseId, this.lookups().courses);
  });

  readonly periodLabel = computed(() => {
    const item = this.classItem();
    return item ? formatPeriod(item.year, item.semester) : '';
  });

  readonly roomLabel = computed(() => {
    const item = this.classItem();
    return item ? formatRoomLabel(item.roomId, this.lookups().rooms) : '';
  });

  readonly professorLabel = computed(() => {
    const item = this.classItem();
    return item
      ? formatProfessorLabel(item.professorId, this.lookups().professors)
      : '';
  });

  readonly statusLabel = computed(() => {
    const item = this.classItem();
    return item ? formatClassStatus(item.status) : '';
  });

  ngOnInit(): void {
    const initialTab = this.route.snapshot.queryParamMap.get('aba') as TabKey | null;
    const idx = initialTab ? TAB_KEYS.indexOf(initialTab) : 0;
    this.selectedTabIndex.set(idx >= 0 ? idx : 0);

    this.load();
  }

  ngAfterViewInit(): void {
    this.headingEl()?.nativeElement.focus();
  }

  load(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.loading.set(false);
      this.error.set({ kind: 'refusal', message: 'Turma não informada.' });
      return;
    }

    this.loading.set(true);
    this.error.set(null);
    this.actionError.set(null);

    forkJoin({
      classItem: this.api.getClass(id),
      lookups: this.api.loadLookups(),
    }).subscribe({
      next: ({ classItem, lookups }) => {
        this.classItem.set(classItem);
        this.lookups.set(lookups);
        this.loading.set(false);
        queueMicrotask(() => this.headingEl()?.nativeElement.focus());
      },
      error: (err) => {
        this.loading.set(false);
        this.error.set(
          extractProblemUiError(
            err,
            'Não foi possível carregar os dados da turma.',
          ),
        );
      },
    });
  }

  onTabIndexChange(index: number): void {
    this.selectedTabIndex.set(index);
    const key = TAB_KEYS[index] ?? 'alunos';
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { aba: key },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  }

  onClassUpdated(updated: ClassItem): void {
    this.classItem.set(updated);
  }

  onEdit(): void {
    const current = this.classItem();
    if (!current) {
      return;
    }
    this.actionError.set(null);
    const ref = openEditDialog<ClassFormDialog, ClassFormDialogData, ClassItem | undefined>(
      this.dialog,
      ClassFormDialog,
      this.breakpoints,
      {
        data: {
          mode: 'edit',
          classItem: current,
          lookups: this.lookups(),
        },
      },
    );

    ref.afterClosed().subscribe((updated) => {
      if (updated) {
        this.classItem.set(updated);
      }
    });
  }

  onDelete(): void {
    const current = this.classItem();
    if (!current) {
      return;
    }
    this.actionError.set(null);
    const ref = openConfirmDialog(
      this.dialog,
      {
        title: `Excluir turma ${this.classCode()}?`,
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
      this.api.deleteClass(current.id).subscribe({
        next: () => {
          void this.router.navigate(['/turmas']);
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
