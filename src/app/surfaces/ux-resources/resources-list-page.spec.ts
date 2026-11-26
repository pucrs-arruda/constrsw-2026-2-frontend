import { BreakpointObserver, BreakpointState } from '@angular/cdk/layout';
import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { provideRouter, Router } from '@angular/router';
import { BehaviorSubject, Observable, map, of } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthSession } from '../../shell/auth-session';
import { ResourceFormDialog } from './resource-form-dialog';
import type { FutureReservation, ResourceView } from './resources-api';
import { ResourcesListPage } from './resources-list-page';

const LIST_URL = `${environment.bffBaseUrl}/v1/resources`;
const ME_URL = `${environment.bffBaseUrl}/v1/identidade/me`;

function reservation(id: string, resourceId: string): FutureReservation {
  return {
    id,
    professorId: 'prof-1',
    lessonId: 'lesson-1',
    data: '2026-12-01',
    faixaId: 'A',
    resourceIds: [resourceId],
    status: 'CONFIRMED',
    enabled: true,
    createdAt: '2026-11-20T10:00:00Z',
    updatedAt: '2026-11-20T10:00:00Z',
  };
}

const SAMPLE: ResourceView[] = [
  {
    id: 'res-1',
    code: 'PROJ-01',
    name: 'Projetor 4K',
    type: 'PROJECTOR',
    active: true,
    tags: ['av'],
    createdAt: '2026-11-01T10:00:00Z',
    updatedAt: '2026-11-01T10:00:00Z',
    openOccurrenceCount: 1,
    reservations: [reservation('rv-1', 'res-1'), reservation('rv-2', 'res-1')],
  },
  {
    id: 'res-2',
    code: 'KIT-SAUDE-01',
    name: 'Kit primeiros socorros',
    type: 'HEALTH_KIT',
    active: false,
    tags: [],
    createdAt: '2026-11-02T10:00:00Z',
    updatedAt: '2026-11-02T10:00:00Z',
    openOccurrenceCount: 0,
    reservations: [],
  },
];

describe('ResourcesListPage', () => {
  let http: HttpTestingController;
  let router: Router;
  let compact$: BehaviorSubject<boolean>;
  let fullColumns$: BehaviorSubject<boolean>;

  beforeEach(async () => {
    compact$ = new BehaviorSubject(false);
    fullColumns$ = new BehaviorSubject(true);

    const bpObserver: BreakpointObserver = {
      isMatched: (query: string) => {
        if (query.includes('599')) {
          return compact$.value;
        }
        if (query.includes('1280')) {
          return fullColumns$.value;
        }
        return false;
      },
      observe: (value: string | readonly string[]) => {
        const query = Array.isArray(value) ? String(value[0]) : String(value);
        const source = query.includes('599')
          ? compact$
          : query.includes('1280')
            ? fullColumns$
            : new BehaviorSubject(false);
        return source.pipe(
          map((matches) => ({ matches, breakpoints: {} })),
        ) as Observable<BreakpointState>;
      },
      ngOnDestroy: () => undefined,
    } as BreakpointObserver;

    await TestBed.configureTestingModule({
      imports: [ResourcesListPage],
      providers: [
        provideAnimationsAsync(),
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: BreakpointObserver, useValue: bpObserver },
      ],
    }).compileComponents();

    http = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);
  });

  afterEach(() => {
    http.verify();
  });

  function flushIdentity(papeis: string[]): void {
    http
      .expectOne(ME_URL)
      .flush({ sub: 'user-1', email: 'ops@pucrs.br', papeis });
  }

  async function renderWith(
    respond: (req: ReturnType<HttpTestingController['expectOne']>) => void,
    papeis: string[] = ['funcionario'],
  ) {
    const fixture = TestBed.createComponent(ResourcesListPage);
    fixture.detectChanges();
    flushIdentity(papeis);
    respond(http.expectOne(LIST_URL));
    await fixture.whenStable();
    fixture.detectChanges();
    return fixture;
  }

  function buttonLabels(fixture: { nativeElement: HTMLElement }): string[] {
    return Array.from(fixture.nativeElement.querySelectorAll('button')).map(
      (btn) => btn.textContent?.replace(/\s+/g, ' ').trim() ?? '',
    );
  }

  it('shows the skeleton while GET /api/v1/resources is in flight', () => {
    const fixture = TestBed.createComponent(ResourcesListPage);
    fixture.detectChanges();
    flushIdentity(['funcionario']);

    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('app-skeleton-block')).not.toBeNull();
    expect(el.querySelector('app-responsive-data-table')).toBeNull();

    http.expectOne(LIST_URL).flush(SAMPLE);
  });

  it('renders Figma 14 columns with pt-BR labels and the future reservation count', async () => {
    const fixture = await renderWith((req) => req.flush(SAMPLE));
    const el = fixture.nativeElement as HTMLElement;

    const headers = Array.from(el.querySelectorAll('th')).map((th) =>
      th.textContent?.trim(),
    );
    expect(headers).toEqual([
      'Nome',
      'Status',
      'Tipo',
      'Reservas futuras',
      'Código',
      'Ações',
    ]);

    const rows = fixture.componentInstance.filteredRows();
    expect(rows[0]).toMatchObject({
      name: 'Projetor 4K',
      typeLabel: 'Projetor',
      statusLabel: 'Ativo',
      futureReservations: '2',
      code: 'PROJ-01',
    });
    expect(rows[1]).toMatchObject({
      typeLabel: 'Kit de saúde',
      statusLabel: 'Inativo',
      futureReservations: '0',
    });
    expect(el.textContent).not.toContain('PROJECTOR');
  });

  it('never labels a resource as a room (sala)', async () => {
    const fixture = await renderWith((req) => req.flush(SAMPLE));
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text.toLowerCase()).not.toContain('sala');
  });

  it('shows Novo recurso and Editar for write roles, never Excluir', async () => {
    const fixture = await renderWith((req) => req.flush(SAMPLE), [
      'funcionario',
    ]);
    const labels = buttonLabels(fixture);
    expect(labels).toContain('add Novo recurso');
    expect(labels).toContain('Abrir');
    expect(labels).toContain('Editar');
    expect(labels).not.toContain('Excluir');
  });

  it('treats administrator as a write role too', async () => {
    const fixture = await renderWith((req) => req.flush(SAMPLE), [
      'administrator',
    ]);
    expect(buttonLabels(fixture)).toContain('Editar');
  });

  it('hides Novo recurso and Editar for read-only roles', async () => {
    const fixture = await renderWith((req) => req.flush(SAMPLE), [
      'professor',
    ]);
    const labels = buttonLabels(fixture);
    expect(labels).toContain('Abrir');
    expect(labels).not.toContain('Editar');
    expect(labels.some((label) => label.includes('Novo recurso'))).toBe(false);
  });

  it('opens the create dialog and reloads the list after a save', async () => {
    const fixture = await renderWith((req) => req.flush(SAMPLE));
    const dialog = TestBed.inject(MatDialog);
    const openSpy = vi.spyOn(dialog, 'open').mockReturnValue({
      afterClosed: () => of({ id: 'res-new' }),
    } as unknown as MatDialogRef<unknown>);

    fixture.componentInstance.onCreate();

    expect(openSpy).toHaveBeenCalledWith(
      ResourceFormDialog,
      expect.objectContaining({ data: { mode: 'create' } }),
    );
    http.expectOne(LIST_URL).flush(SAMPLE);
  });

  it('opens the edit dialog with the row resource and skips reload on cancel', async () => {
    const fixture = await renderWith((req) => req.flush(SAMPLE));
    const dialog = TestBed.inject(MatDialog);
    const openSpy = vi.spyOn(dialog, 'open').mockReturnValue({
      afterClosed: () => of(false),
    } as unknown as MatDialogRef<unknown>);

    fixture.componentInstance.onEditRow({ id: 'res-2' });

    expect(openSpy).toHaveBeenCalledWith(
      ResourceFormDialog,
      expect.objectContaining({
        data: { mode: 'edit', resource: SAMPLE[1] },
      }),
    );
    http.expectNone(LIST_URL);
  });

  it('filters by name, code, type label and tag', async () => {
    const fixture = await renderWith((req) => req.flush(SAMPLE));
    const page = fixture.componentInstance;

    page.onSearchInput('kit de');
    expect(page.filteredRows().map((row) => row.id)).toEqual(['res-2']);

    page.onSearchInput('proj-01');
    expect(page.filteredRows().map((row) => row.id)).toEqual(['res-1']);

    page.onSearchInput('AV');
    expect(page.filteredRows().map((row) => row.id)).toEqual(['res-1']);
  });

  it('shows the no-results state when the search matches nothing', async () => {
    const fixture = await renderWith((req) => req.flush(SAMPLE));
    fixture.componentInstance.onSearchInput('inexistente');
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('Nenhum resultado para a busca.');
    expect(el.querySelector('app-responsive-data-table')).toBeNull();
  });

  it('shows the empty state for []', async () => {
    const fixture = await renderWith((req) => req.flush([]));
    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('Nenhum recurso cadastrado ainda.');
    expect(el.querySelector('app-responsive-data-table')).toBeNull();
  });

  it('shows only the composition banner on 503 (no partial list)', async () => {
    const fixture = await renderWith((req) =>
      req.flush(
        { code: 'BFF-DEPENDENCY' },
        { status: 503, statusText: 'Service Unavailable' },
      ),
    );
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('[role="alert"]')?.textContent).toContain(
      'Serviço de composição indisponível.',
    );
    expect(el.querySelector('app-responsive-data-table')).toBeNull();
    expect(el.querySelector('app-empty-state')).toBeNull();
  });

  it('shows a refusal banner on 403', async () => {
    const fixture = await renderWith((req) =>
      req.flush(
        { title: 'Forbidden', detail: 'Sem permissão para ler recursos.' },
        { status: 403, statusText: 'Forbidden' },
      ),
    );
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('[role="alert"]')?.textContent).toContain(
      'Sem permissão para ler recursos.',
    );
    expect(el.querySelector('app-responsive-data-table')).toBeNull();
  });

  it('clears the session and goes to /login on 401', async () => {
    const session = TestBed.inject(AuthSession);
    const clearSpy = vi.spyOn(session, 'clear');
    const navigateSpy = vi
      .spyOn(router, 'navigateByUrl')
      .mockResolvedValue(true);

    await renderWith((req) =>
      req.flush({}, { status: 401, statusText: 'Unauthorized' }),
    );

    expect(clearSpy).toHaveBeenCalled();
    expect(navigateSpy).toHaveBeenCalledWith('/login');
  });

  it('opens /recursos/{id} from Abrir', async () => {
    const navigateSpy = vi.spyOn(router, 'navigate').mockResolvedValue(true);
    const fixture = await renderWith((req) => req.flush(SAMPLE));

    const openBtn = Array.from(
      (fixture.nativeElement as HTMLElement).querySelectorAll('button'),
    ).find((btn) => btn.textContent?.trim() === 'Abrir');
    openBtn?.click();

    expect(navigateSpy).toHaveBeenCalledWith(['/recursos', 'res-1']);
  });

  it('uses Nome + Status as the 2-line compact list', async () => {
    compact$.next(true);
    const fixture = await renderWith((req) => req.flush(SAMPLE));
    const el = fixture.nativeElement as HTMLElement;

    expect(el.querySelector('table')).toBeNull();
    const first = el.querySelector('.rdt-list__item');
    expect(first?.querySelector('.rdt-list__primary')?.textContent).toContain(
      'Projetor 4K',
    );
    expect(
      el.querySelectorAll('.rdt-list__secondary')[1]?.textContent,
    ).toContain('Inativo');
  });
});
