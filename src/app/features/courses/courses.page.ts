import { BreakpointObserver } from '@angular/cdk/layout';
import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTableModule } from '@angular/material/table';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import {
  Observable,
  Subject,
  catchError,
  combineLatest,
  distinctUntilChanged,
  firstValueFrom,
  map,
  of,
  startWith,
  switchMap,
  takeUntil,
} from 'rxjs';
import {
  ConfirmDialogComponent,
  EmptyStateComponent,
  ErrorBannerComponent,
  RefusalBannerComponent,
  SkeletonComponent,
} from '../../core/ui';
import {
  CourseDetail,
  CoursesApi,
  ExistingTarget,
  Target,
  courseError,
  itemKinds,
  referenceTypes,
} from './courses.api';
import { CourseEditor } from './course-editor';

type Screen =
  | { type: 'loading' }
  | { type: 'error'; message: string }
  | { type: 'list'; courses: CourseDetail[] }
  | { type: 'detail'; course: CourseDetail };

function searchable(text: string) {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('pt-BR')
    .trim();
}

@Component({
  selector: 'app-courses',
  imports: [
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatTableModule,
    RouterLink,
    EmptyStateComponent,
    ErrorBannerComponent,
    RefusalBannerComponent,
    SkeletonComponent,
  ],
  templateUrl: './courses.page.html',
  styleUrl: './courses.page.scss',
})
export class CoursesPage {
  private readonly api = inject(CoursesApi);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly dialogs = inject(MatDialog);
  private readonly snack = inject(MatSnackBar);
  private readonly breakpoints = inject(BreakpointObserver);
  private readonly destroyRef = inject(DestroyRef);
  private readonly refresh = new Subject<void>();
  readonly screen = signal<Screen>({ type: 'loading' });
  readonly search = signal(this.route.snapshot.queryParamMap.get('busca') ?? '');
  readonly filtered = computed(() => {
    const screen = this.screen();
    const term = searchable(this.search());
    return screen.type === 'list'
      ? screen.courses.filter((c) => searchable(c.code + ' ' + c.name).includes(term))
      : [];
  });
  readonly query = computed(() => (this.search().trim() ? { busca: this.search().trim() } : {}));
  readonly references = referenceTypes;
  readonly kinds = itemKinds;
  readonly columns = ['code', 'name', 'classes', 'hours', 'actions'];
  readonly deleting = signal(false);
  readonly refusal = signal('');
  readonly detailRoute = signal(false);

  constructor() {
    combineLatest([
      this.route.paramMap.pipe(
        map((params) => params.get('id')),
        distinctUntilChanged(),
      ),
      this.refresh.pipe(startWith(undefined)),
    ])
      .pipe(
        switchMap(([id]) => {
          this.detailRoute.set(!!id);
          this.refusal.set('');
          const response: Observable<Screen> = id
            ? this.api.get(id).pipe(map((course) => ({ type: 'detail', course }) as const))
            : this.api.list().pipe(map((courses) => ({ type: 'list', courses }) as const));
          return response.pipe(
            catchError((error) =>
              of({ type: 'error', message: courseError(error, 'course', 'read') } as const),
            ),
            startWith({ type: 'loading' } as const),
          );
        }),
        takeUntilDestroyed(),
      )
      .subscribe((screen) => this.screen.set(screen));
  }

  reload() {
    this.refresh.next();
  }

  async edit(target: Target) {
    const ref = this.dialogs.open(CourseEditor, {
      data: target,
      width: '560px',
      maxWidth: '100vw',
      disableClose: true,
      autoFocus: 'first-tabbable',
    });
    this.breakpoints
      .observe('(max-width: 599px)')
      .pipe(takeUntil(ref.afterClosed()))
      .subscribe(({ matches }) => {
        ref.updateSize(matches ? '100vw' : '560px', matches ? '100dvh' : '');
        if (matches) ref.addPanelClass('courses-fullscreen');
        else ref.removePanelClass('courses-fullscreen');
      });
    const saved = await firstValueFrom(ref.afterClosed());
    if (!saved || this.destroyRef.destroyed) return;
    this.snack.open('Alterações salvas.', 'Fechar', { duration: 3500 });
    if (!target.course)
      await this.router.navigate(['/disciplinas', saved], { queryParams: this.query() });
    else this.reload();
  }

  async remove(target: ExistingTarget) {
    if (this.deleting()) return;
    const name =
      target.kind === 'course'
        ? target.course.name
        : target.kind === 'reference'
          ? target.reference.title
          : target.item.statement;
    const label =
      target.kind === 'course'
        ? 'disciplina'
        : target.kind === 'reference'
          ? 'referência'
          : 'item do plano';
    const confirmed = await firstValueFrom(
      this.dialogs
        .open(ConfirmDialogComponent, {
          data: {
            title: 'Excluir ' + label + '?',
            message:
              'Você vai excluir “' +
              name +
              '”' +
              (target.kind === 'course' ? ' do catálogo.' : ' desta disciplina.'),
            confirmLabel: 'Excluir',
            destructive: true,
          },
          maxWidth: 'calc(100vw - 48px)',
          width: '400px',
        })
        .afterClosed(),
    );
    if (!confirmed || this.destroyRef.destroyed || this.deleting()) return;
    this.deleting.set(true);
    this.refusal.set('');
    try {
      await firstValueFrom(this.api.remove(target));
      if (this.destroyRef.destroyed) return;
      this.snack.open('Registro excluído.', 'Fechar', { duration: 3500 });
      if (target.kind === 'course' && this.detailRoute()) {
        await this.router.navigate(['/disciplinas'], { queryParams: this.query() });
      } else this.reload();
    } catch (error) {
      this.refusal.set(courseError(error, target.kind, 'delete'));
    } finally {
      this.deleting.set(false);
    }
  }
}
