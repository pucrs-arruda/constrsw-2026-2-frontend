import { BreakpointObserver, BreakpointState } from '@angular/cdk/layout';
import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { ActivatedRoute, provideRouter, Router, convertToParamMap } from '@angular/router';
import { BehaviorSubject, Observable, of, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import { EmployeesDetailPage } from './employees-detail-page';
import {
  EmployeesApi,
  type DependentRead,
  type EmployeeRead,
} from './employees-api';

const DEPENDENT: DependentRead = {
  id: 'dep-1',
  enabled: true,
  name: 'Caio Costa',
  birthDate: '2010-05-01',
  dependencyType: 'filho',
  status: 'Active',
};

const EMPLOYEE: EmployeeRead = {
  id: 'emp-1',
  enabled: true,
  registrationNumber: '100',
  name: 'Helena Costa',
  salary: 8500.5,
  hireDate: '2020-01-15',
  position: 'Analista',
  status: 'Active',
  dependents: [DEPENDENT],
  email: 'helena.costa@pucrs.br',
  phone: '51999990000',
};

describe('EmployeesDetailPage', () => {
  let http: HttpTestingController;
  let router: Router;
  let compact$: BehaviorSubject<boolean>;
  let fullColumns$: BehaviorSubject<boolean>;
  let paramMap$: BehaviorSubject<ReturnType<typeof convertToParamMap>>;
  let dialogOpen: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    compact$ = new BehaviorSubject(false);
    fullColumns$ = new BehaviorSubject(true);
    paramMap$ = new BehaviorSubject(convertToParamMap({ id: 'emp-1' }));
    dialogOpen = vi.fn();

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
      imports: [EmployeesDetailPage],
      providers: [
        provideAnimationsAsync(),
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: BreakpointObserver, useValue: bpObserver },
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: { paramMap: convertToParamMap({ id: 'emp-1' }) },
            paramMap: paramMap$.asObservable(),
          },
        },
        {
          provide: MatDialog,
          useValue: { open: dialogOpen, closeAll: vi.fn() },
        },
      ],
    }).compileComponents();

    http = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);
  });

  afterEach(() => {
    http.verify();
  });

  function createPage() {
    const fixture = TestBed.createComponent(EmployeesDetailPage);
    fixture.detectChanges();
    return fixture;
  }

  function flushIdentity(papeis: string[] = ['funcionario']): void {
    const req = http.expectOne(`${environment.bffBaseUrl}/v1/identidade/me`);
    req.flush({ sub: 'user-1', email: 'ops@pucrs.br', papeis });
  }

  function flushEmployee(body: EmployeeRead = EMPLOYEE): void {
    const req = http.expectOne(
      `${environment.bffBaseUrl}/v1/employees/emp-1`,
    );
    req.flush(body);
  }

  function flushPending(options?: {
    papeis?: string[];
    employee?: EmployeeRead;
  }): void {
    const meUrl = `${environment.bffBaseUrl}/v1/identidade/me`;
    const detailUrl = `${environment.bffBaseUrl}/v1/employees/emp-1`;
    for (const req of http.match(() => true)) {
      if (req.request.url === meUrl) {
        req.flush({
          sub: 'user-1',
          email: 'ops@pucrs.br',
          papeis: options?.papeis ?? ['funcionario'],
        });
      } else if (req.request.url === detailUrl) {
        req.flush(options?.employee ?? EMPLOYEE);
      }
    }
  }

  it('loads employee master and dependents on 200', async () => {
    const fixture = createPage();
    expect(fixture.nativeElement.querySelector('app-skeleton-block')).not.toBeNull();

    flushPending();
    await fixture.whenStable();
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('app-skeleton-block')).toBeNull();
    expect(el.textContent).toContain('Helena Costa');
    expect(el.textContent).toContain('100');
    expect(el.textContent).toContain('Analista');
    expect(el.textContent).toContain('Caio Costa');
    expect(el.textContent).toContain('filho');
    expect(el.textContent).toContain('Ativo');
  });

  it('shows not-found empty state with Voltar on 404', async () => {
    const fixture = createPage();
    flushIdentity();
    const detailReq = http.expectOne(
      `${environment.bffBaseUrl}/v1/employees/emp-1`,
    );
    detailReq.flush(
      { detail: 'Employee não encontrado' },
      { status: 404, statusText: 'Not Found' },
    );
    await fixture.whenStable();
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('app-empty-state')).not.toBeNull();
    expect(el.textContent).toContain('Funcionário não encontrado.');
    expect(el.textContent).toContain('Voltar para Funcionários');
    expect(el.querySelector('app-responsive-data-table')).toBeNull();
  });

  it('shows composition AlertBanner on 503', async () => {
    const fixture = createPage();
    flushIdentity();
    const detailReq = http.expectOne(
      `${environment.bffBaseUrl}/v1/employees/emp-1`,
    );
    detailReq.flush(
      { message: 'down' },
      { status: 503, statusText: 'Service Unavailable' },
    );
    await fixture.whenStable();
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    const alert = el.querySelector('[role="alert"]');
    expect(alert?.textContent).toContain('Serviço de composição indisponível.');
    expect(el.querySelector('app-responsive-data-table')).toBeNull();
  });

  it('clears session and navigates to login on 401', async () => {
    const fixture = createPage();
    const navigateSpy = vi.spyOn(router, 'navigateByUrl').mockResolvedValue(true);
    flushIdentity();
    const detailReq = http.expectOne(
      `${environment.bffBaseUrl}/v1/employees/emp-1`,
    );
    detailReq.flush(
      { message: 'unauthorized' },
      { status: 401, statusText: 'Unauthorized' },
    );
    await fixture.whenStable();
    fixture.detectChanges();

    expect(navigateSpy).toHaveBeenCalledWith('/login');
    expect(fixture.componentInstance.canWriteDependents()).toBe(false);
  });

  it('shows Novo and write actions for funcionario role', async () => {
    const fixture = createPage();
    flushPending({ papeis: ['funcionario'] });
    await fixture.whenStable();
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    const nova = Array.from(el.querySelectorAll('button')).filter((btn) =>
      (btn.textContent ?? '').trim().includes('Novo'),
    );
    expect(nova.length).toBeGreaterThan(0);
    expect(el.textContent).toContain('Editar');
    expect(el.textContent).toContain('Excluir');
  });

  it('hides write actions without funcionario role', async () => {
    const fixture = createPage();
    flushPending({ papeis: ['professor'] });
    await fixture.whenStable();
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    const nova = Array.from(el.querySelectorAll('button')).filter((btn) =>
      (btn.textContent ?? '').trim().includes('Novo'),
    );
    expect(nova).toHaveLength(0);
    expect(el.textContent).not.toContain('Editar');
    expect(el.textContent).not.toContain('Excluir');
  });

  it('shows compact back link below 600px', async () => {
    compact$.next(true);
    const fixture = createPage();
    flushPending();
    await fixture.whenStable();
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    const back = el.querySelector('.employees-detail__back');
    expect(back).not.toBeNull();
    expect(back?.textContent).toContain('← Voltar para Funcionários');
  });

  it('refreshes via getById after dependent dialog saves', async () => {
    const fixture = createPage();
    const page = fixture.componentInstance;
    flushPending();
    await fixture.whenStable();
    fixture.detectChanges();

    dialogOpen.mockReturnValue({
      afterClosed: () => of(true),
      componentInstance: {},
    } as unknown as MatDialogRef<unknown, boolean>);

    page.onCreateDependent();
    expect(dialogOpen).toHaveBeenCalled();

    const refresh = http.expectOne(
      `${environment.bffBaseUrl}/v1/employees/emp-1`,
    );
    expect(refresh.request.method).toBe('GET');
    refresh.flush({
      ...EMPLOYEE,
      dependents: [
        DEPENDENT,
        {
          id: 'dep-2',
          enabled: true,
          name: 'Ana Costa',
          birthDate: '2012-01-01',
          dependencyType: 'filha',
          status: 'Active',
        },
      ],
    });
    await fixture.whenStable();
    fixture.detectChanges();

    expect((fixture.nativeElement as HTMLElement).textContent).toContain(
      'Ana Costa',
    );
  });

  it('deletes dependent after confirm and refreshes', async () => {
    const fixture = createPage();
    const page = fixture.componentInstance;
    flushPending();
    await fixture.whenStable();
    fixture.detectChanges();

    dialogOpen.mockReturnValue({
      afterClosed: () => of(true),
      componentInstance: {},
    } as unknown as MatDialogRef<unknown, boolean>);

    page.onDeleteDependent({
      id: 'dep-1',
      name: 'Caio Costa',
      dependencyType: 'filho',
      statusLabel: 'Ativo',
      birthDate: '01/05/2010',
    });

    expect(dialogOpen).toHaveBeenCalled();
    const openArgs = dialogOpen.mock.calls[0];
    expect(openArgs[1].data.title).toContain('Caio Costa');

    const deleteReq = http.expectOne(
      `${environment.bffBaseUrl}/v1/employees/emp-1/dependents/dep-1`,
    );
    expect(deleteReq.request.method).toBe('DELETE');
    deleteReq.flush(null, { status: 204, statusText: 'No Content' });

    const refresh = http.expectOne(
      `${environment.bffBaseUrl}/v1/employees/emp-1`,
    );
    refresh.flush({ ...EMPLOYEE, dependents: [] });
    await fixture.whenStable();
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('Nenhum dependente cadastrado.');
    expect(el.textContent).not.toContain('Caio Costa');
  });

  it('createDependent POSTs DependentWrite body', () => {
    const fixture = createPage();
    flushPending();
    fixture.detectChanges();

    const api = TestBed.inject(EmployeesApi);
    let created: DependentRead | undefined;
    api
      .createDependent('emp-1', {
        name: 'Ana Costa',
        birthDate: '2012-01-01',
        dependencyType: 'filha',
        status: 'Active',
      })
      .subscribe((value) => {
        created = value;
      });

    const post = http.expectOne(
      `${environment.bffBaseUrl}/v1/employees/emp-1/dependents`,
    );
    expect(post.request.method).toBe('POST');
    expect(post.request.body).toEqual({
      name: 'Ana Costa',
      birthDate: '2012-01-01',
      dependencyType: 'filha',
      status: 'Active',
    });
    post.flush({
      id: 'dep-2',
      enabled: true,
      name: 'Ana Costa',
      birthDate: '2012-01-01',
      dependencyType: 'filha',
      status: 'Active',
    });
    expect(created?.id).toBe('dep-2');
    expect(fixture.componentInstance.employee()?.name).toBe('Helena Costa');
  });
});
