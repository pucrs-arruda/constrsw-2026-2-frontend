import { BreakpointObserver } from '@angular/cdk/layout';
import { afterNextRender, Component, DestroyRef, ElementRef, inject, signal, viewChild } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatChipsModule } from '@angular/material/chips';
import { MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatMenuModule } from '@angular/material/menu';
import { MatPaginatorIntl, MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatSortModule, Sort } from '@angular/material/sort';
import { MatTableModule } from '@angular/material/table';
import { ActivatedRoute, ParamMap, Router, RouterLink } from '@angular/router';
import { catchError, debounceTime, map, merge, of, Subject, switchMap, tap } from 'rxjs';
import { AuthService } from '../../../auth/auth.service';
import { ApiError } from '../../../shared/http/api-error';
import { ConfirmDialogComponent, EmptyStateComponent, ErrorBannerComponent, RefusalBannerComponent, SkeletonComponent } from '../../../shared/ui';
import { RoomsApiService } from '../data/rooms-api.service';
import { Page, Room, RoomFilter, RoomQuery, RoomView } from '../data/rooms.models';
import { RoomFormDialog } from './room-form.dialog';

const searchFields = ['code', 'name', 'building'] as const;
type SearchField = typeof searchFields[number];
type SortField = NonNullable<RoomQuery['sort']>['field'];
const sortFields = new Set<string>([...searchFields, 'capacity', 'active']);
const sizes = [10, 20, 50];

function roomState(params: ParamMap) {
  const field = searchFields.find(field => field === params.get('campo')) ?? 'code';
  const capacity = Number(params.get('capMin'));
  const page = Number(params.get('page'));
  const size = Number(params.get('size'));
  const [active, direction] = (params.get('sort') ?? '').split(',');
  const sort: Sort = sortFields.has(active) && (direction === 'asc' || direction === 'desc')
    ? { active, direction }
    : { active: '', direction: '' };
  return {
    q: params.get('q')?.trim() ?? '',
    campo: field,
    predio: params.get('predio')?.trim() ?? '',
    capMin: Number.isSafeInteger(capacity) && capacity > 0 ? capacity : null,
    ativa: params.get('ativa') === 'true' || params.get('ativa') === 'false' ? params.get('ativa')! : '',
    page: Number.isSafeInteger(page) && page >= 0 ? page : 0,
    size: sizes.includes(size) ? size : 20,
    sort,
  };
}

function roomQuery(state: ReturnType<typeof roomState>): RoomQuery {
  const filters: RoomFilter[] = [];
  if (state.q) filters.push({ field: state.campo, op: 'like', value: '%' + state.q + '%' });
  if (state.predio) filters.push({ field: 'building', op: 'like', value: '%' + state.predio + '%' });
  if (state.capMin !== null) filters.push({ field: 'capacity', op: 'gteq', value: state.capMin });
  if (state.ativa) filters.push({ field: 'active', op: 'eq', value: state.ativa === 'true' });
  return {
    filters,
    page: state.page,
    size: state.size,
    ...(state.sort.direction && { sort: { field: state.sort.active as SortField, dir: state.sort.direction } }),
  };
}

function paginatorLabels(): MatPaginatorIntl {
  const labels = new MatPaginatorIntl();
  labels.itemsPerPageLabel = 'Salas por página';
  labels.previousPageLabel = 'Página anterior';
  labels.nextPageLabel = 'Próxima página';
  labels.getRangeLabel = (page, size, total) =>
    total ? `${page * size + 1}–${Math.min((page + 1) * size, total)} de ${total}` : '0 de 0';
  return labels;
}

@Component({
  selector: 'app-rooms-list',
  imports: [
    ReactiveFormsModule, RouterLink, MatButtonModule, MatChipsModule, MatFormFieldModule,
    MatInputModule, MatMenuModule, MatPaginatorModule, MatProgressBarModule, MatSelectModule,
    MatSortModule, MatTableModule, EmptyStateComponent, ErrorBannerComponent, RefusalBannerComponent,
    SkeletonComponent,
  ],
  providers: [{ provide: MatPaginatorIntl, useFactory: paginatorLabels }],
  templateUrl: './rooms-list.page.html',
  styleUrl: './rooms-list.page.scss',
})
export class RoomsListPage {
  private readonly api = inject(RoomsApiService);
  readonly auth = inject(AuthService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly dialog = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);
  private readonly destroyRef = inject(DestroyRef);
  private readonly heading = viewChild.required<ElementRef<HTMLHeadingElement>>('heading');
  private readonly reload = new Subject<void>();

  readonly state = signal(roomState(this.route.snapshot.queryParamMap));
  readonly rooms = signal<Page<RoomView> | null>(null);
  readonly error = signal<ApiError | null>(null);
  readonly loading = signal(true);
  readonly filtersOpen = signal(false);
  readonly sizes = sizes;
  readonly layout = toSignal(inject(BreakpointObserver).observe([
    '(max-width: 599px)', '(min-width: 1280px)',
  ]).pipe(map(({ breakpoints }) => {
    if (breakpoints['(max-width: 599px)']) return 'compact';
    return breakpoints['(min-width: 1280px)'] ? 'expanded' : 'medium';
  })), { initialValue: 'medium' });

  private readonly builder = inject(FormBuilder);
  readonly filters = this.builder.group({
    q: this.builder.nonNullable.control(''),
    campo: this.builder.nonNullable.control<SearchField>('code'),
    predio: this.builder.nonNullable.control(''),
    capMin: this.builder.control<number | null>(null),
    ativa: this.builder.nonNullable.control(''),
  });

  constructor() {
    afterNextRender(() => this.heading().nativeElement.focus());
    const fromUrl = this.route.queryParamMap.pipe(tap(params => {
      this.state.set(roomState(params));
      this.filters.patchValue(this.state(), { emitEvent: false });
    }));
    merge(fromUrl, this.reload).pipe(
      switchMap(() => {
        this.loading.set(true);
        this.error.set(null);
        return this.api.list(roomQuery(this.state())).pipe(
          map(page => ({ page, error: null })),
          catchError((error: ApiError) => of({
            page: error.kind === 'not-found' ? { items: [], total: 0 } : null,
            error: error.kind === 'not-found' ? null : error,
          })),
        );
      }),
      takeUntilDestroyed(),
    ).subscribe(({ page, error }) => {
      this.rooms.set(page);
      this.error.set(error);
      this.loading.set(false);
    });

    const { q, campo, predio, capMin, ativa } = this.filters.controls;
    merge(
      merge(q.valueChanges, predio.valueChanges).pipe(debounceTime(300)),
      campo.valueChanges, capMin.valueChanges, ativa.valueChanges,
    ).pipe(takeUntilDestroyed()).subscribe(() => {
      const filters = this.filters.getRawValue();
      const current = this.state();
      const q = filters.q.trim();
      const predio = filters.predio.trim();
      const capMin = filters.capMin !== null && Number.isSafeInteger(filters.capMin) && filters.capMin > 0
        ? filters.capMin : null;
      if (q === current.q && predio === current.predio && capMin === current.capMin &&
          filters.campo === current.campo && filters.ativa === current.ativa) return;
      this.navigate({ ...filters, q: q || null, predio: predio || null, capMin, ativa: filters.ativa || null, page: null });
    });
  }

  columns(): string[] {
    return this.layout() === 'expanded'
      ? ['code', 'name', 'building', 'capacity', 'active', 'classes', 'actions']
      : ['code', 'building', 'capacity', 'classes', 'actions'];
  }

  private navigate(queryParams: Record<string, string | number | null>): void {
    void this.router.navigate([], { relativeTo: this.route, queryParams, queryParamsHandling: 'merge' });
  }

  setSort({ active, direction }: Sort): void {
    this.navigate({ sort: direction ? active + ',' + direction : null, page: null });
  }

  setPage({ pageIndex, pageSize }: PageEvent): void {
    this.navigate({ page: pageIndex, size: pageSize });
  }

  hasFilters(): boolean {
    const { q, predio, capMin, ativa } = this.state();
    return !!(q || predio || capMin || ativa);
  }

  clearFilters(): void {
    this.navigate({ q: null, campo: null, predio: null, capMin: null, ativa: null, page: null });
  }

  capacityLabel(room: Room): string {
    return room.capacity === null ? 'Capacidade não informada' : String(room.capacity);
  }

  retry(): void {
    this.reload.next();
  }

  openRoom(room: Room): void {
    void this.router.navigate(['/salas', room.id]);
  }

  openForm(room?: Room): void {
    if (!this.auth.isAdmin()) return;
    RoomFormDialog.open(this.dialog, room ? { mode: 'edit', room } : { mode: 'create' })
      .afterClosed().pipe(takeUntilDestroyed(this.destroyRef)).subscribe(saved => {
        if (!saved) return;
        this.notify(room ? `Sala ${saved.code} atualizada.` : `Sala ${saved.code} criada.`);
        this.retry();
      });
  }

  confirmRemove(room: Room): void {
    if (!this.auth.isAdmin()) return;
    this.dialog.open(ConfirmDialogComponent, {
      width: '400px',
      data: {
        title: `Excluir sala ${room.code}?`,
        message: `A sala ${room.code} (${room.name}) deixará de aparecer nas listas e os recursos vinculados a ela serão liberados. Esta ação não pode ser desfeita pela interface.`,
        confirmLabel: 'Excluir sala',
        destructive: true,
      },
    }).afterClosed().pipe(takeUntilDestroyed(this.destroyRef)).subscribe(confirmed => {
      if (confirmed && this.auth.isAdmin()) this.remove(room);
    });
  }

  private remove(room: Room): void {
    this.api.remove(room.id).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => this.afterRemoval(room, `Sala ${room.code} excluída.`),
      error: (error: ApiError) => {
        if (error.kind === 'not-found') {
          this.afterRemoval(room, 'A sala já havia sido excluída.');
          return;
        }
        this.notify(error.kind === 'forbidden' ? 'Você não tem permissão para esta ação.' : error.message);
      },
    });
  }

  private afterRemoval(room: Room, message: string): void {
    this.notify(message);
    const items = this.rooms()?.items;
    const page = this.state().page;
    if (page > 0 && items?.length === 1 && items[0].id === room.id) {
      this.navigate({ page: page - 1 });
    } else {
      this.retry();
    }
  }

  private notify(message: string): void {
    this.snackBar.open(message, 'Fechar', { duration: 5000 });
  }
}
