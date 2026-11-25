import { BreakpointObserver, BreakpointState } from '@angular/cdk/layout';
import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { provideRouter, Router } from '@angular/router';
import { BehaviorSubject, Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import { EmployeesListPage } from './employees-list-page';
import type { EmployeeRead } from './employees-api';

const SAMPLE: EmployeeRead[] = [
  {
    id: 'emp-1',
    enabled: true,
    registrationNumber: '100',
    name: 'Helena Costa',
    salary: 8500.5,
    hireDate: '2020-01-15',
    position: 'Analista',
    status: 'Active',
    dependents: [],
    email: 'helena.costa@pucrs.br',
  },
  {
    id: 'emp-2',
    enabled: true,
    registrationNumber: '200',
    name: 'Bruno Alves',
    salary: 7200,
    hireDate: '2021-03-01',
    position: 'Assistente',
    status: 'Inactive',
    dependents: [],
    email: 'bruno.alves@pucrs.br',
  },
];

describe('EmployeesListPage', () => {
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
      imports: [EmployeesListPage],
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

  function createPage() {
    const fixture = TestBed.createComponent(EmployeesListPage);
    fixture.detectChanges();
    return fixture;
  }

  function flushIdentity(papeis: string[] = ['funcionario']): void {
    const req = http.expectOne(`${environment.bffBaseUrl}/v1/identidade/me`);
    req.flush({ sub: 'user-1', email: 'ops@pucrs.br', papeis });
  }

  function flushEmployees(body: EmployeeRead[]): void {
    const req = http.expectOne(`${environment.bffBaseUrl}/v1/employees`);
    req.flush(body);
  }

  function flushPending(options?: {
    papeis?: string[];
    employees?: EmployeeRead[];
  }): void {
    const meUrl = `${environment.bffBaseUrl}/v1/identidade/me`;
    const listUrl = `${environment.bffBaseUrl}/v1/employees`;
    for (const req of http.match(() => true)) {
      if (req.request.url === meUrl) {
        req.flush({
          sub: 'user-1',
          email: 'ops@pucrs.br',
          papeis: options?.papeis ?? ['funcionario'],
        });
      } else if (req.request.url === listUrl) {
        req.flush(options?.employees ?? SAMPLE);
      }
    }
  }

  it('renders success list from GET /api/v1/employees', async () => {
    const fixture = createPage();
    expect(fixture.nativeElement.querySelector('app-skeleton-block')).not.toBeNull();

    flushPending();
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('app-skeleton-block')).toBeNull();
    expect(el.textContent).toContain('Helena Costa');
    expect(el.textContent).toContain('Bruno Alves');
    expect(el.textContent).toContain('Ativo');
    expect(el.textContent).toContain('Inativo');
    expect(el.textContent).toContain('incluindo inativos');
  });

  it('keeps Inactive employees listable with Inativo label', async () => {
    const fixture = createPage();
    flushPending();
    await fixture.whenStable();
    fixture.detectChanges();

    const page = fixture.componentInstance;
    const inactiveRow = page.filteredRows().find((row) => row.id === 'emp-2');
    expect(inactiveRow).toBeTruthy();
    expect(inactiveRow?.['statusLabel']).toBe('Inativo');

    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('Bruno Alves');
    expect(el.textContent).toContain('Inativo');
  });

  it('shows empty state when list is []', async () => {
    const fixture = createPage();
    flushPending({ employees: [] });
    await fixture.whenStable();
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('app-empty-state')).not.toBeNull();
    expect(el.textContent).toContain('Nenhum funcionário cadastrado ainda.');
    expect(el.querySelector('app-responsive-data-table')).toBeNull();
    const fab = el.querySelector('button.employees-list__fab');
    expect(fab).not.toBeNull();
    expect((fab?.textContent ?? '').trim()).toContain('Novo');
  });

  it('treats list 404 as empty catalog and keeps create FAB', async () => {
    const fixture = createPage();
    flushIdentity(['funcionario']);
    const listReq = http.expectOne(`${environment.bffBaseUrl}/v1/employees`);
    listReq.flush(
      { message: 'not found' },
      { status: 404, statusText: 'Not Found' },
    );
    await fixture.whenStable();
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('app-empty-state')).not.toBeNull();
    expect(el.querySelector('[role="alert"]')).toBeNull();
    expect(el.querySelector('button.employees-list__fab')).not.toBeNull();
  });

  it('filters rows client-side by search query', async () => {
    const fixture = createPage();
    const page = fixture.componentInstance;
    flushPending();
    await fixture.whenStable();
    fixture.detectChanges();

    page.onSearchInput('bruno');
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('Bruno Alves');
    expect(el.textContent).not.toContain('Helena Costa');
  });

  it('shows composition AlertBanner on 503', async () => {
    const fixture = createPage();
    flushIdentity();
    const listReq = http.expectOne(`${environment.bffBaseUrl}/v1/employees`);
    listReq.flush(
      { message: 'down' },
      { status: 503, statusText: 'Service Unavailable' },
    );
    await fixture.whenStable();
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    const alert = el.querySelector('[role="alert"]');
    expect(alert?.textContent).toContain('Serviço de composição indisponível.');
    expect(el.querySelector('app-responsive-data-table')).toBeNull();
    expect(el.querySelector('app-empty-state')).toBeNull();
  });

  it('keeps skeleton while the list request is in flight', () => {
    const fixture = createPage();
    flushIdentity();

    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('app-skeleton-block')).not.toBeNull();
    expect(el.querySelector('app-empty-state')).toBeNull();
    expect(el.querySelector('app-responsive-data-table')).toBeNull();

    flushEmployees(SAMPLE);
    fixture.detectChanges();
  });

  it('hides create FAB when identity has no funcionario role', async () => {
    const fixture = createPage();
    flushPending({ papeis: ['professor'] });
    await fixture.whenStable();
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('button.employees-list__fab')).toBeNull();
  });

  it('navigates to detail stub when Abrir is clicked', async () => {
    const fixture = createPage();
    const navigateSpy = vi.spyOn(router, 'navigateByUrl').mockResolvedValue(true);
    flushPending();
    await fixture.whenStable();
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    const openBtn = Array.from(el.querySelectorAll('button')).find((btn) =>
      (btn.textContent ?? '').trim().includes('Abrir'),
    );
    expect(openBtn).toBeTruthy();
    openBtn!.click();
    fixture.detectChanges();

    expect(navigateSpy).toHaveBeenCalledWith('/funcionarios/emp-1');
  });

  it('navigates to create when FAB Novo is clicked', async () => {
    const fixture = createPage();
    const navigateSpy = vi.spyOn(router, 'navigateByUrl').mockResolvedValue(true);
    flushPending({ papeis: ['funcionario'] });
    await fixture.whenStable();
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    const fab = el.querySelector('button.employees-list__fab') as HTMLButtonElement | null;
    expect(fab).toBeTruthy();
    fab!.click();
    expect(navigateSpy).toHaveBeenCalledWith('/funcionarios/novo');
  });

  it('shows search-empty state when filter matches nothing', async () => {
    const fixture = createPage();
    const page = fixture.componentInstance;
    flushPending();
    await fixture.whenStable();
    fixture.detectChanges();

    page.onSearchInput('zzzz-sem-match');
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('Nenhum resultado para a busca.');
    expect(el.querySelector('app-responsive-data-table')).toBeNull();
  });

  it('clears session and navigates to login on employees 401', async () => {
    const fixture = createPage();
    const navigateSpy = vi.spyOn(router, 'navigateByUrl').mockResolvedValue(true);
    flushIdentity();
    const listReq = http.expectOne(`${environment.bffBaseUrl}/v1/employees`);
    listReq.flush(
      { message: 'unauthorized' },
      { status: 401, statusText: 'Unauthorized' },
    );
    await fixture.whenStable();
    fixture.detectChanges();

    expect(navigateSpy).toHaveBeenCalledWith('/login');
    expect(fixture.componentInstance.canCreate()).toBe(false);
  });
});
