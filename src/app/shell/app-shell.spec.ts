import { BreakpointObserver, BreakpointState } from '@angular/cdk/layout';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { provideRouter, Router, RouterOutlet } from '@angular/router';
import { BehaviorSubject, Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { AppShell } from './app-shell';
import { AuthSession } from './auth-session';
import { bearerInterceptor } from './bearer.interceptor';
import { HomeLanding } from './home-landing';
import { LoginPage } from './login-page';
import { NAV_ITEMS } from './nav-items';
import { SurfacePlaceholder } from './surface-placeholder';

@Component({
  selector: 'app-test-host',
  standalone: true,
  imports: [RouterOutlet],
  template: '<router-outlet />',
})
class TestHost {}

describe('AppShell', () => {
  let http: HttpTestingController;
  let session: AuthSession;
  let router: Router;
  let expanded$: BehaviorSubject<boolean>;
  let compact$: BehaviorSubject<boolean>;

  const shellRoutes = [
    {
      path: 'login',
      component: LoginPage,
    },
    {
      path: '',
      component: AppShell,
      children: [
        { path: '', pathMatch: 'full' as const, component: HomeLanding },
        {
          path: 'funcionarios',
          component: SurfacePlaceholder,
          data: { title: 'Funcionários' },
        },
        ...NAV_ITEMS.filter((i) => i.path !== '/funcionarios').map((item) => ({
          path: item.path.replace(/^\//, ''),
          component: SurfacePlaceholder,
          data: { title: item.label },
        })),
      ],
    },
  ];

  beforeEach(async () => {
    expanded$ = new BehaviorSubject(true);
    compact$ = new BehaviorSubject(false);

    const bpObserver: BreakpointObserver = {
      isMatched: (query: string) => {
        if (query.includes('1024')) {
          return expanded$.value;
        }
        if (query.includes('599')) {
          return compact$.value;
        }
        return false;
      },
      observe: (value: string | readonly string[]) => {
        const query = Array.isArray(value) ? String(value[0]) : String(value);
        const source = query.includes('1024')
          ? expanded$
          : query.includes('599')
            ? compact$
            : new BehaviorSubject(false);
        return new Observable<BreakpointState>((subscriber) => {
          const sub = source.subscribe((matches) => {
            subscriber.next({
              matches,
              breakpoints: { [query]: matches },
            });
          });
          return () => sub.unsubscribe();
        });
      },
    } as BreakpointObserver;

    TestBed.resetTestingModule();
    await TestBed.configureTestingModule({
      imports: [TestHost, AppShell, LoginPage, HomeLanding, SurfacePlaceholder],
      providers: [
        provideAnimationsAsync(),
        provideRouter(shellRoutes),
        provideHttpClient(withInterceptors([bearerInterceptor])),
        provideHttpClientTesting(),
        { provide: BreakpointObserver, useValue: bpObserver },
      ],
    }).compileComponents();

    http = TestBed.inject(HttpTestingController);
    session = TestBed.inject(AuthSession);
    router = TestBed.inject(Router);
    session.applyTokens({ access_token: 'shell-tok' });
  });

  afterEach(() => {
    http.verify();
    session.clear();
  });

  async function openShell(url = '/'): Promise<{
    fixture: ReturnType<typeof TestBed.createComponent<TestHost>>;
  }> {
    const fixture = TestBed.createComponent(TestHost);
    fixture.detectChanges();
    await router.navigateByUrl(url);
    fixture.detectChanges();

    const meReq = http.expectOne(`${environment.bffBaseUrl}/v1/identidade/me`);
    meReq.flush({
      sub: 'alice',
      email: 'alice.silva@pucrs.br',
      papeis: ['admin'],
      employeeId: 'e1',
      professorId: null,
      studentId: null,
    });
    await fixture.whenStable();
    fixture.detectChanges();
    return { fixture };
  }

  it('me 200 fills identity (email + initials) and lists 10 nav items', async () => {
    const { fixture } = await openShell();
    const el = fixture.nativeElement as HTMLElement;

    expect(el.querySelector('app-shell')).toBeTruthy();
    expect(el.querySelector('.app-shell__display-name')?.textContent).toContain(
      'alice.silva@pucrs.br',
    );
    expect(el.querySelector('.app-shell__avatar')?.textContent?.trim()).toBe(
      'AS',
    );

    // O rótulo é o `[matListItemTitle]`: o `textContent` do <a> inclui a
    // ligadura do ícone (ex. "badgeFuncionários").
    const labels = Array.from(
      el.querySelectorAll('mat-nav-list a [matListItemTitle]'),
    ).map((a) => a.textContent?.trim());
    expect(labels).toEqual(NAV_ITEMS.map((i) => i.label));
    expect(el.querySelector('.home-landing__title')?.textContent).toContain(
      'Início',
    );
  });

  it('me 401 clears session and navigates to /login', async () => {
    const fixture = TestBed.createComponent(TestHost);
    fixture.detectChanges();
    const navigateSpy = vi.spyOn(router, 'navigateByUrl');

    await router.navigateByUrl('/');
    fixture.detectChanges();

    const meReq = http.expectOne(`${environment.bffBaseUrl}/v1/identidade/me`);
    meReq.flush(
      { message: 'unauthorized' },
      { status: 401, statusText: 'Unauthorized' },
    );
    await fixture.whenStable();
    fixture.detectChanges();

    expect(session.accessToken).toBeNull();
    expect(navigateSpy).toHaveBeenCalledWith('/login');
  });

  it('me 503 keeps shell and shows institutional identity fallback', async () => {
    const fixture = TestBed.createComponent(TestHost);
    fixture.detectChanges();
    await router.navigateByUrl('/');
    fixture.detectChanges();

    const meReq = http.expectOne(`${environment.bffBaseUrl}/v1/identidade/me`);
    meReq.flush(
      { message: 'down' },
      { status: 503, statusText: 'Service Unavailable' },
    );
    await fixture.whenStable();
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('app-shell')).toBeTruthy();
    expect(el.querySelector('.app-shell__display-name')?.textContent).toContain(
      'Identidade indisponível.',
    );
    expect(el.querySelector('mat-nav-list')).toBeTruthy();
    expect(session.accessToken).toBe('shell-tok');
  });

  it('me network failure keeps shell with identity fallback', async () => {
    const fixture = TestBed.createComponent(TestHost);
    fixture.detectChanges();
    await router.navigateByUrl('/');
    fixture.detectChanges();

    const meReq = http.expectOne(`${environment.bffBaseUrl}/v1/identidade/me`);
    meReq.error(new ProgressEvent('error'));
    await fixture.whenStable();
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('app-shell')).toBeTruthy();
    expect(el.querySelector('.app-shell__display-name')?.textContent).toContain(
      'Identidade indisponível.',
    );
  });

  it('Sair calls logout and navigates to /login', async () => {
    const { fixture } = await openShell();
    const navigateSpy = vi.spyOn(router, 'navigateByUrl');
    const el = fixture.nativeElement as HTMLElement;
    const sair = el.querySelector('.app-shell__sair') as HTMLButtonElement;
    expect(sair).toBeTruthy();
    sair.click();

    const logoutReq = http.expectOne(`${environment.oauthBaseUrl}/logout`);
    logoutReq.flush({ status: 'signed_out' });
    await fixture.whenStable();

    expect(session.accessToken).toBeNull();
    expect(navigateSpy).toHaveBeenCalledWith('/login');
  });

  it('marks the active nav item for the current route', async () => {
    const { fixture } = await openShell('/funcionarios');
    const el = fixture.nativeElement as HTMLElement;
    const active = el.querySelector('a.app-shell__nav-item--active');
    expect(active?.querySelector('[matListItemTitle]')?.textContent?.trim()).toBe(
      'Funcionários',
    );
    expect(
      el.querySelector('.surface-placeholder__title')?.textContent,
    ).toContain('Funcionários');
  });

  it('login route renders LoginPage without AppShell chrome', async () => {
    session.clear();
    const fixture = TestBed.createComponent(TestHost);
    fixture.detectChanges();
    await router.navigateByUrl('/login');
    await fixture.whenStable();
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('app-shell')).toBeNull();
    expect(el.querySelector('app-login-page')).toBeTruthy();
    expect(el.querySelector('.app-shell__sair')).toBeNull();
    http.expectNone(`${environment.bffBaseUrl}/v1/identidade/me`);
  });

  it('uses side mode when expanded and over mode below 1024', async () => {
    const { fixture } = await openShell();
    const shell = fixture.debugElement.query(
      (d) => d.componentInstance instanceof AppShell,
    )?.componentInstance as AppShell;
    expect(shell.sidenavMode()).toBe('side');
    expect(shell.sidenavOpened()).toBe(true);

    expanded$.next(false);
    fixture.detectChanges();
    expect(shell.sidenavMode()).toBe('over');
    expect(shell.sidenavOpened()).toBe(false);
  });

  it('document Escape closes modal sheet below 1024', async () => {
    expanded$.next(false);
    const { fixture } = await openShell();
    const shell = fixture.debugElement.query(
      (d) => d.componentInstance instanceof AppShell,
    )?.componentInstance as AppShell;

    shell.sheetOpen.set(true);
    fixture.detectChanges();
    expect(shell.sidenavOpened()).toBe(true);

    shell.onDocumentEscape();
    fixture.detectChanges();
    expect(shell.sheetOpen()).toBe(false);
  });

  it('clears residual sheetOpen when viewport expands to ≥1024', async () => {
    expanded$.next(false);
    const { fixture } = await openShell();
    const shell = fixture.debugElement.query(
      (d) => d.componentInstance instanceof AppShell,
    )?.componentInstance as AppShell;

    shell.sheetOpen.set(true);
    fixture.detectChanges();

    expanded$.next(true);
    fixture.detectChanges();
    expect(shell.sheetOpen()).toBe(false);
    expect(shell.sidenavMode()).toBe('side');
  });
});
