import { BreakpointObserver } from '@angular/cdk/layout';
import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { DateAdapter, MAT_DATE_FORMATS, MAT_DATE_LOCALE } from '@angular/material/core';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { ActivatedRoute, ParamMap, Router } from '@angular/router';
import { Observable, Subject, catchError, map, of, switchMap } from 'rxjs';
import { BffRequestError, type AlertBannerKind } from '../../shared/http';
import {
  AlertBanner,
  EmptyState,
  ResponsiveDataTable,
  SkeletonBlock,
  type DataTableColumn,
  type DataTableRow,
} from '../../shared/ui';
import { AuthSession } from '../../shell/auth-session';
import {
  BR_DATE_FORMATS,
  BrDateAdapter,
  parseIsoDate,
  toBrDate,
  toIsoDate,
  todayInSaoPaulo,
} from './br-date';
import { FAIXAS, isFaixaId, type FaixaId } from './faixas';
import { OccupancyApi, type OcupacaoItem, type OcupacaoQuery } from './occupancy-api';

/** Ids crus do OcupacaoItem (frame 23); sem nomes = sem join no cliente e sem dado de Student. */
const OCCUPANCY_COLUMNS: readonly DataTableColumn[] = [
  { key: 'resourceId', header: 'Recurso', priority: 'high' },
  { key: 'lessonId', header: 'Aula', priority: 'high' },
  { key: 'professorId', header: 'Professor', priority: 'low' },
  { key: 'reservationId', header: 'Reserva', priority: 'low' },
];

export const INVALID_LINK_MESSAGE =
  'O endereço tem data ou faixa inválida. Escolha a data e a faixa de novo.';

type Outcome = { ok: true; items: OcupacaoItem[] } | { ok: false; error: unknown };
type Status = 'idle' | 'loading' | 'done' | 'error';

/** Mesmo corte do kit: <600px a tabela vira lista de 2 linhas, sem cabeçalho de coluna. */
const COMPACT_QUERY = '(max-width: 599.98px)';

/** Em compact a lista não tem cabeçalho; o rótulo vai junto do id para dizer o que é cada linha. */
function toRow(item: OcupacaoItem, compact: boolean): DataTableRow {
  return {
    id: `${item.reservationId}:${item.resourceId}`,
    resourceId: compact ? `Recurso ${item.resourceId}` : item.resourceId,
    lessonId: compact ? `Aula ${item.lessonId}` : item.lessonId,
    professorId: item.professorId,
    reservationId: item.reservationId,
  };
}

@Component({
  selector: 'app-occupancy-page',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatDatepickerModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    AlertBanner,
    EmptyState,
    ResponsiveDataTable,
    SkeletonBlock,
  ],
  providers: [
    { provide: DateAdapter, useClass: BrDateAdapter },
    { provide: MAT_DATE_LOCALE, useValue: 'pt-BR' },
    { provide: MAT_DATE_FORMATS, useValue: BR_DATE_FORMATS },
  ],
  templateUrl: './occupancy-page.html',
  styleUrl: './occupancy-page.scss',
})
export class OccupancyPage implements OnInit {
  private readonly api = inject(OccupancyApi);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly session = inject(AuthSession);
  private readonly destroyRef = inject(DestroyRef);
  private readonly queries = new Subject<OcupacaoQuery>();
  private readonly breakpoints = inject(BreakpointObserver);
  private readonly compact = toSignal(
    this.breakpoints.observe(COMPACT_QUERY).pipe(map((state) => state.matches)),
    { initialValue: this.breakpoints.isMatched(COMPACT_QUERY) },
  );

  readonly faixas = FAIXAS;
  readonly columns = OCCUPANCY_COLUMNS;

  readonly form = new FormGroup({
    data: new FormControl<Date | null>(todayInSaoPaulo(), Validators.required),
    faixaId: new FormControl<FaixaId | null>(null, Validators.required),
  });

  readonly status = signal<Status>('idle');
  readonly items = signal<OcupacaoItem[]>([]);
  readonly lastQuery = signal<OcupacaoQuery | null>(null);
  readonly bannerKind = signal<AlertBannerKind | null>(null);
  readonly bannerMessage = signal('');

  readonly rows = computed(() => this.items().map((item) => toRow(item, this.compact())));
  readonly countLabel = computed(() => {
    const n = this.items().length;
    return n === 1 ? '1 recurso ocupado' : `${n} recursos ocupados`;
  });
  readonly emptyTitle = computed(() => {
    const query = this.lastQuery();
    const date = query ? parseIsoDate(query.data) : null;
    return query && date
      ? `Nenhum recurso ocupado em ${toBrDate(date)}, faixa ${query.faixaId}.`
      : 'Nenhum recurso ocupado.';
  });

  ngOnInit(): void {
    this.queries
      .pipe(
        switchMap((query) => this.fetch(query)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((outcome) => this.show(outcome));

    this.route.queryParamMap
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((params) => this.applyParams(params));
  }

  onSubmit(): void {
    const { data, faixaId } = this.form.getRawValue();
    if (this.form.invalid || !data || !faixaId) {
      this.form.markAllAsTouched();
      return;
    }
    const query: OcupacaoQuery = { data: toIsoDate(data), faixaId };
    const current = this.route.snapshot.queryParamMap;
    if (current.get('data') === query.data && current.get('faixaId') === query.faixaId) {
      // Mesma URL: o router não emite de novo, então consulta direto (botão "Consultar" repetido).
      this.queries.next(query);
      return;
    }
    void this.router.navigate([], { relativeTo: this.route, queryParams: query });
  }

  private applyParams(params: ParamMap): void {
    const rawData = params.get('data');
    const rawFaixa = params.get('faixaId');
    if (rawData === null && rawFaixa === null) {
      this.reset();
      return;
    }
    const date = parseIsoDate(rawData);
    if (!date || !isFaixaId(rawFaixa)) {
      this.reset();
      this.showBanner('refusal', INVALID_LINK_MESSAGE);
      return;
    }
    this.form.setValue({ data: date, faixaId: rawFaixa });
    this.queries.next({ data: toIsoDate(date), faixaId: rawFaixa });
  }

  private reset(): void {
    this.form.reset({ data: todayInSaoPaulo(), faixaId: null });
    this.items.set([]);
    this.lastQuery.set(null);
    this.status.set('idle');
    this.clearBanner();
  }

  private fetch(query: OcupacaoQuery): Observable<Outcome> {
    this.lastQuery.set(query);
    this.items.set([]);
    this.clearBanner();
    this.status.set('loading');
    return this.api.list(query).pipe(
      map((items): Outcome => ({ ok: true, items: Array.isArray(items) ? items : [] })),
      catchError((error: unknown) => of<Outcome>({ ok: false, error })),
    );
  }

  private show(outcome: Outcome): void {
    if (outcome.ok) {
      this.items.set(outcome.items);
      this.status.set('done');
      return;
    }
    this.status.set('error');
    const err = outcome.error;
    if (err instanceof BffRequestError) {
      if (err.mapped.kind === 'unauthorized' || err.mapped.status === 401) {
        this.session.clear();
        void this.router.navigateByUrl('/login');
        return;
      }
      const kind = err.mapped.bannerKind;
      if (kind) {
        this.showBanner(kind, err.mapped.message);
        return;
      }
    }
    this.showBanner('composition', '');
  }

  private showBanner(kind: AlertBannerKind, message: string): void {
    this.bannerKind.set(kind);
    this.bannerMessage.set(message);
  }

  private clearBanner(): void {
    this.bannerKind.set(null);
    this.bannerMessage.set('');
  }
}
