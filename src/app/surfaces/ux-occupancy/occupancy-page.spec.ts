import { BreakpointObserver, BreakpointState } from '@angular/cdk/layout';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { Router, provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { BehaviorSubject, Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthSession } from '../../shell/auth-session';
import { BrDateAdapter, parseIsoDate, toIsoDate, todayInSaoPaulo } from './br-date';
import type { OcupacaoItem } from './occupancy-api';
import { INVALID_LINK_MESSAGE, OccupancyPage } from './occupancy-page';

const URL = `${environment.bffBaseUrl}/v1/reservations/ocupacao`;

const ITEMS: OcupacaoItem[] = [
  {
    reservationId: '60000000-0000-4000-8000-000000000001',
    professorId: 'aaaaaaaa-0000-4000-8000-000000000001',
    lessonId: '30000000-0000-4000-8000-000000000001',
    resourceId: '50000000-0000-4000-8000-000000000001',
  },
  {
    reservationId: '60000000-0000-4000-8000-000000000005',
    professorId: 'aaaaaaaa-0000-4000-8000-000000000002',
    lessonId: '30000000-0000-4000-8000-000000000002',
    resourceId: '50000000-0000-4000-8000-000000000002',
  },
];

describe('OccupancyPage', () => {
  let http: HttpTestingController;
  let harness: RouterTestingHarness;
  let compact$: BehaviorSubject<boolean>;

  beforeEach(async () => {
    compact$ = new BehaviorSubject(false);
    const full$ = new BehaviorSubject(true);
    const bpObserver = {
      isMatched: (q: string) => (q.includes('599') ? compact$.value : full$.value),
      observe: (value: string | readonly string[]) => {
        const q = Array.isArray(value) ? String(value[0]) : String(value);
        return (q.includes('599') ? compact$ : full$).pipe(
          map((matches) => ({ matches, breakpoints: {} })),
        ) as Observable<BreakpointState>;
      },
      ngOnDestroy: () => undefined,
    } as unknown as BreakpointObserver;

    TestBed.configureTestingModule({
      providers: [
        provideAnimationsAsync(),
        provideRouter([
          { path: 'ocupacao', component: OccupancyPage },
          { path: 'login', children: [] },
        ]),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: BreakpointObserver, useValue: bpObserver },
      ],
    });
    http = TestBed.inject(HttpTestingController);
    harness = await RouterTestingHarness.create();
  });

  afterEach(() => http.verify());

  async function open(url: string): Promise<OccupancyPage> {
    const page = await harness.navigateByUrl(url, OccupancyPage);
    harness.detectChanges();
    return page;
  }

  function el(): HTMLElement {
    return harness.routeNativeElement as HTMLElement;
  }

  async function settle(): Promise<void> {
    harness.detectChanges();
    await harness.fixture.whenStable();
    harness.detectChanges();
  }

  it('primeira abertura: data = hoje (São Paulo), sem faixa, sem chamada e com dica', async () => {
    const page = await open('/ocupacao');
    http.expectNone(() => true);
    expect(toIsoDate(page.form.controls.data.value!)).toBe(toIsoDate(todayInSaoPaulo()));
    expect(page.form.controls.faixaId.value).toBeNull();
    expect(el().textContent).toContain('Escolha a data e a faixa.');
    const submit = el().querySelector<HTMLButtonElement>('button[type="submit"]');
    expect(submit?.disabled).toBe(true);
  });

  it('link direto consulta a BFF com data e faixa e lista os ids', async () => {
    const page = await open('/ocupacao?data=2026-12-08&faixaId=C');
    expect(el().querySelector('app-skeleton-block')).not.toBeNull();

    const req = http.expectOne((r) => r.url === URL);
    expect(req.request.params.get('data')).toBe('2026-12-08');
    expect(req.request.params.get('faixaId')).toBe('C');
    req.flush(ITEMS);
    await settle();

    expect(page.form.controls.faixaId.value).toBe('C');
    expect(el().querySelector('app-skeleton-block')).toBeNull();
    const text = el().textContent ?? '';
    expect(text).toContain('2 recursos ocupados');
    expect(text).toContain('50000000-0000-4000-8000-000000000001');
    expect(text).toContain('50000000-0000-4000-8000-000000000002');
    for (const header of ['Recurso', 'Aula', 'Professor', 'Reserva']) {
      expect(text).toContain(header);
    }
  });

  it('não mostra ações de linha (tela só de leitura)', async () => {
    await open('/ocupacao?data=2026-12-08&faixaId=C');
    http.expectOne((r) => r.url === URL).flush(ITEMS);
    await settle();
    const labels = Array.from(el().querySelectorAll('button')).map((b) => b.textContent?.trim());
    expect(labels).not.toContain('Abrir');
    expect(labels).not.toContain('Editar');
    expect(labels).not.toContain('Excluir');
  });

  it('vazio: empty-state com data em pt-BR e a faixa', async () => {
    await open('/ocupacao?data=2026-12-13&faixaId=A');
    http.expectOne((r) => r.url === URL).flush([]);
    await settle();
    expect(el().querySelector('app-empty-state')).not.toBeNull();
    expect(el().textContent).toContain('Nenhum recurso ocupado em 13/12/2026, faixa A.');
    expect(el().querySelector('app-responsive-data-table')).toBeNull();
  });

  it('submit navega com a consulta na URL e consulta', async () => {
    const page = await open('/ocupacao');
    page.form.setValue({ data: parseIsoDate('2026-12-08'), faixaId: 'D' });
    page.onSubmit();
    await settle();

    expect(TestBed.inject(Router).url).toBe('/ocupacao?data=2026-12-08&faixaId=D');
    http.expectOne((r) => r.url === URL && r.params.get('faixaId') === 'D').flush([ITEMS[1]]);
    await settle();
    expect(el().textContent).toContain('1 recurso ocupado');
  });

  it('Consultar de novo com a mesma URL refaz a consulta', async () => {
    const page = await open('/ocupacao?data=2026-12-08&faixaId=C');
    http.expectOne((r) => r.url === URL).flush(ITEMS);
    await settle();

    page.onSubmit();
    http.expectOne((r) => r.url === URL).flush([]);
    await settle();
    expect(el().querySelector('app-empty-state')).not.toBeNull();
  });

  it('link com data ou faixa inválida: limpa o form, avisa e não chama a BFF', async () => {
    for (const url of [
      '/ocupacao?data=2026-02-31&faixaId=C',
      '/ocupacao?data=2026-12-08&faixaId=O',
    ]) {
      const page = await open(url);
      http.expectNone(() => true);
      expect(page.form.controls.faixaId.value).toBeNull();
      expect(el().querySelector('[role="alert"]')?.textContent).toContain(INVALID_LINK_MESSAGE);
    }
  });

  it('400 do domínio: refusal-banner com o detail e o form mantém os valores', async () => {
    const page = await open('/ocupacao?data=2026-12-08&faixaId=C');
    http
      .expectOne((r) => r.url === URL)
      .flush(
        {
          type: 'about:blank',
          title: 'Requisição inválida',
          status: 400,
          detail: 'faixaId inválida.',
        },
        { status: 400, statusText: 'Bad Request' },
      );
    await settle();
    expect(el().querySelector('[role="alert"]')?.textContent).toContain('faixaId inválida.');
    expect(page.form.controls.faixaId.value).toBe('C');
    expect(el().querySelector('app-responsive-data-table')).toBeNull();
  });

  it('503: banner de composição, sem resultado parcial', async () => {
    await open('/ocupacao?data=2026-12-08&faixaId=C');
    http
      .expectOne((r) => r.url === URL)
      .flush(
        { status: 503, title: 'Dependência indisponível' },
        { status: 503, statusText: 'Service Unavailable' },
      );
    await settle();
    expect(el().querySelector('[role="alert"]')?.textContent).toContain(
      'Serviço de composição indisponível.',
    );
    expect(el().querySelector('app-responsive-data-table')).toBeNull();
    expect(el().querySelector('app-empty-state')).toBeNull();
  });

  it('401: limpa a sessão e vai para o login', async () => {
    const session = TestBed.inject(AuthSession);
    const clear = vi.spyOn(session, 'clear');
    await open('/ocupacao?data=2026-12-08&faixaId=C');
    http
      .expectOne((r) => r.url === URL)
      .flush(
        { status: 401, title: 'Não autenticado' },
        { status: 401, statusText: 'Unauthorized' },
      );
    await settle();
    expect(clear).toHaveBeenCalled();
    expect(TestBed.inject(Router).url).toBe('/login');
  });

  it('domingo é consulta normal (o domínio devolve vazio)', async () => {
    await open('/ocupacao?data=2026-12-13&faixaId=C');
    const req = http.expectOne((r) => r.url === URL);
    expect(req.request.params.get('data')).toBe('2026-12-13');
    req.flush([]);
    await settle();
    expect(el().querySelector('app-empty-state')).not.toBeNull();
  });

  it('compact: resultado vira lista sem ações', async () => {
    compact$.next(true);
    await open('/ocupacao?data=2026-12-08&faixaId=C');
    http.expectOne((r) => r.url === URL).flush(ITEMS);
    await settle();
    expect(el().querySelector('.rdt-list')).not.toBeNull();
    expect(el().querySelector('table')).toBeNull();
    expect(el().textContent).not.toContain('Mais ações');
    expect(el().textContent).toContain('Recurso 50000000-0000-4000-8000-000000000001');
    expect(el().textContent).toContain('Aula 30000000-0000-4000-8000-000000000001');
  });
});

describe('BrDateAdapter', () => {
  let adapter: BrDateAdapter;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [BrDateAdapter] });
    adapter = TestBed.inject(BrDateAdapter);
  });

  it('lê dd/mm/aaaa e recusa datas que não existem', () => {
    expect(toIsoDate(adapter.parse('08/12/2026')!)).toBe('2026-12-08');
    expect(adapter.parse('31/02/2026')).toBeNull();
    expect(adapter.parse('2026-12-08x')).toBeNull();
  });

  it('mostra dd/mm/aaaa', () => {
    expect(adapter.format(parseIsoDate('2026-12-08')!, 'dd/mm/aaaa')).toBe('08/12/2026');
  });

  it('hoje em São Paulo vira a data civil de lá', () => {
    // 02:00 UTC de 09/12 ainda é 08/12 em São Paulo (UTC-3).
    expect(toIsoDate(todayInSaoPaulo(new Date('2026-12-09T02:00:00Z')))).toBe('2026-12-08');
  });
});
