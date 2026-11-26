import { BreakpointObserver, BreakpointState } from '@angular/cdk/layout';
import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { ActivatedRoute, convertToParamMap, provideRouter, Router } from '@angular/router';
import { BehaviorSubject, Observable, map, of } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthSession } from '../../shell/auth-session';
import { OccurrenceFormDialog } from './occurrence-form-dialog';
import { ResourceFormDialog } from './resource-form-dialog';
import type { Occurrence, ResourceAggregateView } from './resources-api';
import { ResourcesDetailPage, formatDate } from './resources-detail-page';

const ID = 'res-1';
const DETAIL_URL = `${environment.bffBaseUrl}/v1/resources/${ID}`;
const ME_URL = `${environment.bffBaseUrl}/v1/identidade/me`;

function occurrence(overrides: Partial<Occurrence>): Occurrence {
  return {
    id: 'occ-1',
    resourceId: ID,
    description: 'Lâmpada fraca',
    type: 'MALFUNCTION',
    priority: 'MEDIUM',
    status: 'OPEN',
    resolution: null,
    reportedBy: 'user-1',
    resolvedBy: null,
    createdAt: '2026-11-20T13:00:00Z',
    resolvedAt: null,
    updatedAt: '2026-11-20T13:00:00Z',
    ...overrides,
  };
}

const AGGREGATE: ResourceAggregateView = {
  id: ID,
  code: 'PROJ-01',
  name: 'Projetor 4K',
  type: 'PROJECTOR',
  active: true,
  tags: ['av', 'sala-3'],
  createdAt: '2026-11-01T10:00:00Z',
  updatedAt: '2026-11-01T10:00:00Z',
  openOccurrenceCount: 1,
  reservations: [],
  occurrences: [
    occurrence({
      id: 'occ-old',
      description: 'Cabo HDMI solto',
      status: 'RESOLVED',
      resolution: 'Cabo trocado',
      createdAt: '2026-11-25T09:00:00Z',
    }),
    occurrence({ id: 'occ-open' }),
  ],
};

describe('ResourcesDetailPage', () => {
  let http: HttpTestingController;
  let compact$: BehaviorSubject<boolean>;

  beforeEach(async () => {
    compact$ = new BehaviorSubject(false);
    const bpObserver = {
      isMatched: (query: string) => (query.includes('599') ? compact$.value : false),
      observe: (value: string | readonly string[]) => {
        const query = Array.isArray(value) ? String(value[0]) : String(value);
        const source = query.includes('599') ? compact$ : new BehaviorSubject(false);
        return source.pipe(
          map((matches) => ({ matches, breakpoints: {} })),
        ) as Observable<BreakpointState>;
      },
      ngOnDestroy: () => undefined,
    } as unknown as BreakpointObserver;

    await TestBed.configureTestingModule({
      imports: [ResourcesDetailPage],
      providers: [
        provideAnimationsAsync(),
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: BreakpointObserver, useValue: bpObserver },
        {
          provide: ActivatedRoute,
          useValue: { paramMap: of(convertToParamMap({ id: ID })) },
        },
      ],
    }).compileComponents();

    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify();
  });

  async function render(
    respond: (req: ReturnType<HttpTestingController['expectOne']>) => void,
    papeis: string[] = ['funcionario'],
  ) {
    const fixture = TestBed.createComponent(ResourcesDetailPage);
    fixture.detectChanges();
    http.expectOne(ME_URL).flush({ sub: 'u', email: 'ops@pucrs.br', papeis });
    respond(http.expectOne(DETAIL_URL));
    await fixture.whenStable();
    fixture.detectChanges();
    return fixture;
  }

  function text(fixture: { nativeElement: HTMLElement }): string {
    return fixture.nativeElement.textContent?.replace(/\s+/g, ' ') ?? '';
  }

  it('renders the Figma 15 card: name, código, tipo, status and etiquetas', async () => {
    const fixture = await render((req) => req.flush(AGGREGATE));
    const content = text(fixture);

    expect(content).toContain('Projetor 4K');
    expect(content).toContain('Ficha do recurso e ocorrências.');
    expect(content).toContain('PROJ-01');
    expect(content).toContain('Projetor');
    expect(content).toContain('Ativo');
    expect(content).toContain('av, sala-3');
    expect(content).not.toContain('PROJECTOR');
  });

  it('labels an inactive resource as not reservable', async () => {
    const fixture = await render((req) =>
      req.flush({ ...AGGREGATE, active: false }),
    );
    expect(text(fixture)).toContain('Recurso inativo — não pode ser reservado.');
  });

  it('lists occurrences open-first in the "descrição — status" format with the open counter', async () => {
    const fixture = await render((req) => req.flush(AGGREGATE));
    const el = fixture.nativeElement as HTMLElement;

    const titles = Array.from(
      el.querySelectorAll('.resource-detail__occurrence-title'),
    ).map((node) => node.textContent?.trim());
    expect(titles).toEqual([
      'Lâmpada fraca — Aberta',
      'Cabo HDMI solto — Resolvida',
    ]);
    expect(
      el
        .querySelector('.resource-detail__occurrences .resource-detail__count')
        ?.textContent?.trim(),
    ).toBe('1');
    expect(text(fixture)).toContain('Defeito · Prioridade média · 20/11/2026');
    expect(text(fixture)).toContain('Resolução: Cabo trocado');
  });

  it('shows T3 future reservations read-only, sorted by date + faixa, active count', async () => {
    const base = {
      professorId: 'prof-1',
      lessonId: 'lesson-1',
      resourceIds: [ID],
      enabled: true,
      createdAt: '2026-11-20T10:00:00Z',
      updatedAt: '2026-11-20T10:00:00Z',
    };
    const fixture = await render((req) =>
      req.flush({
        ...AGGREGATE,
        reservations: [
          { ...base, id: 'rv-3', data: '2026-12-02', faixaId: 'A', status: 'ACTIVE' },
          {
            ...base,
            id: 'rv-2',
            data: '2026-12-01',
            faixaId: 'K',
            status: 'CANCELLED',
          },
          {
            ...base,
            id: 'rv-1',
            data: '2026-12-01',
            faixaId: 'B',
            status: 'ACTIVE',
            purpose: 'Aula prática de redes',
          },
        ],
      }),
    );
    const el = fixture.nativeElement as HTMLElement;

    const titles = Array.from(
      el.querySelectorAll('.resource-detail__reservation-title'),
    ).map((node) => node.textContent?.trim());
    expect(titles).toEqual([
      '01/12/2026 · Faixa B (08:45)',
      '01/12/2026 · Faixa K (18:15)',
      '02/12/2026 · Faixa A (08:00)',
    ]);
    const metas = Array.from(
      el.querySelectorAll('.resource-detail__reservation-meta'),
    ).map((node) => node.textContent?.replace(/\s+/g, ' ').trim());
    expect(metas).toEqual(['Ativa · Aula prática de redes', 'Cancelada', 'Ativa']);
    expect(
      el.querySelectorAll('.resource-detail__reservation--cancelled').length,
    ).toBe(1);

    const counts = Array.from(el.querySelectorAll('.resource-detail__count')).map(
      (node) => node.textContent?.trim(),
    );
    // [reservas futuras ativas, ocorrências abertas]
    expect(counts).toEqual(['2', '1']);
    // No reservation write actions on this page.
    expect(text(fixture)).not.toContain('Nova reserva');
  });

  it('shows the empty reservations message for []', async () => {
    const fixture = await render((req) => req.flush(AGGREGATE));
    expect(text(fixture)).toContain('Nenhuma reserva futura.');
  });

  it('shows the empty occurrences message', async () => {
    const fixture = await render((req) =>
      req.flush({ ...AGGREGATE, occurrences: [], openOccurrenceCount: 0 }),
    );
    expect(text(fixture)).toContain('Nenhuma ocorrência registrada.');
  });

  it('shows write actions only for write roles', async () => {
    const writer = await render((req) => req.flush(AGGREGATE));
    expect(text(writer)).toContain('Editar recurso');
    expect(text(writer)).toContain('Registrar ocorrência');
    expect(
      (writer.nativeElement as HTMLElement).querySelectorAll(
        '.resource-detail__occurrence-action',
      ).length,
    ).toBe(1);
  });

  it('hides write actions for read-only roles', async () => {
    const reader = await render((req) => req.flush(AGGREGATE), ['professor']);
    expect(text(reader)).not.toContain('Editar recurso');
    expect(text(reader)).not.toContain('Registrar ocorrência');
    expect(
      (reader.nativeElement as HTMLElement).querySelector(
        '.resource-detail__occurrence-action',
      ),
    ).toBeNull();
  });

  it('opens the resource edit dialog and reloads after save', async () => {
    const fixture = await render((req) => req.flush(AGGREGATE));
    const openSpy = vi.spyOn(TestBed.inject(MatDialog), 'open').mockReturnValue({
      afterClosed: () => of({ id: ID }),
    } as unknown as MatDialogRef<unknown>);

    fixture.componentInstance.onEditResource();

    expect(openSpy).toHaveBeenCalledWith(
      ResourceFormDialog,
      expect.objectContaining({ data: { mode: 'edit', resource: AGGREGATE } }),
    );
    http.expectOne(DETAIL_URL).flush(AGGREGATE);
  });

  it('opens register / resolve occurrence dialogs and reloads the aggregate', async () => {
    const fixture = await render((req) => req.flush(AGGREGATE));
    const openSpy = vi.spyOn(TestBed.inject(MatDialog), 'open').mockReturnValue({
      afterClosed: () => of({ id: 'occ-new' }),
    } as unknown as MatDialogRef<unknown>);
    const page = fixture.componentInstance;

    page.onRegisterOccurrence();
    expect(openSpy).toHaveBeenLastCalledWith(
      OccurrenceFormDialog,
      expect.objectContaining({
        data: { mode: 'register', resourceId: ID, resourceName: 'Projetor 4K' },
      }),
    );
    http.expectOne(DETAIL_URL).flush(AGGREGATE);

    const open = AGGREGATE.occurrences.find((o) => o.status === 'OPEN')!;
    page.onResolveOccurrence(open);
    expect(openSpy).toHaveBeenLastCalledWith(
      OccurrenceFormDialog,
      expect.objectContaining({
        data: { mode: 'resolve', resourceId: ID, occurrence: open },
      }),
    );
    http.expectOne(DETAIL_URL).flush(AGGREGATE);
  });

  it('never opens resolve for an already resolved occurrence', async () => {
    const fixture = await render((req) => req.flush(AGGREGATE));
    const openSpy = vi.spyOn(TestBed.inject(MatDialog), 'open');
    const resolved = AGGREGATE.occurrences.find((o) => o.status === 'RESOLVED')!;

    fixture.componentInstance.onResolveOccurrence(resolved);
    expect(openSpy).not.toHaveBeenCalled();
  });

  it('shows not-found with a way back on 404', async () => {
    const fixture = await render((req) =>
      req.flush({ title: 'Not Found' }, { status: 404, statusText: 'Not Found' }),
    );
    expect(text(fixture)).toContain('Recurso não encontrado.');
    expect(text(fixture)).toContain('Voltar para Recursos');
    expect(
      (fixture.nativeElement as HTMLElement).querySelector('[role="alert"]'),
    ).toBeNull();
  });

  it('shows only the composition banner on 503 (no partial aggregate)', async () => {
    const fixture = await render((req) =>
      req.flush(
        { code: 'BFF-DEPENDENCY' },
        { status: 503, statusText: 'Service Unavailable' },
      ),
    );
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('[role="alert"]')?.textContent).toContain(
      'Serviço de composição indisponível.',
    );
    expect(el.querySelector('.resource-detail__layout')).toBeNull();
  });

  it('clears the session and goes to /login on 401', async () => {
    const clearSpy = vi.spyOn(TestBed.inject(AuthSession), 'clear');
    const navigateSpy = vi
      .spyOn(TestBed.inject(Router), 'navigateByUrl')
      .mockResolvedValue(true);

    await render((req) => req.flush({}, { status: 401, statusText: 'Unauthorized' }));

    expect(clearSpy).toHaveBeenCalled();
    expect(navigateSpy).toHaveBeenCalledWith('/login');
  });

  it('shows the back link only on compact', async () => {
    compact$.next(true);
    const fixture = await render((req) => req.flush(AGGREGATE));
    expect(text(fixture)).toContain('← Voltar para Recursos');
  });

  it('formats dates in pt-BR (America/Sao_Paulo)', () => {
    expect(formatDate('2026-11-20T13:00:00Z')).toBe('20/11/2026');
    expect(formatDate('2026-11-21T01:00:00Z')).toBe('20/11/2026');
    expect(formatDate(null)).toBe('');
    expect(formatDate('not a date')).toBe('');
  });
});
