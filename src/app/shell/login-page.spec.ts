import { provideHttpClient, withInterceptors } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { provideRouter, Router } from '@angular/router';
import { environment } from '../../environments/environment';
import { AuthSession } from './auth-session';
import { bearerInterceptor } from './bearer.interceptor';
import { LoginPage } from './login-page';

describe('LoginPage', () => {
  let http: HttpTestingController;
  let session: AuthSession;
  let router: Router;

  beforeEach(async () => {
    TestBed.resetTestingModule();
    await TestBed.configureTestingModule({
      imports: [LoginPage],
      providers: [
        provideAnimationsAsync(),
        provideRouter([{ path: '', pathMatch: 'full', children: [] }]),
        provideHttpClient(withInterceptors([bearerInterceptor])),
        provideHttpClientTesting(),
      ],
    }).compileComponents();

    http = TestBed.inject(HttpTestingController);
    session = TestBed.inject(AuthSession);
    router = TestBed.inject(Router);
    session.clear();
  });

  afterEach(() => {
    http.verify();
    session.clear();
  });

  function createPage() {
    const fixture = TestBed.createComponent(LoginPage);
    const page = fixture.componentInstance;
    fixture.detectChanges();
    return { fixture, page };
  }

  it('stores Bearer and navigates HOME on login 201', async () => {
    const { fixture, page } = createPage();
    const navigateSpy = vi.spyOn(router, 'navigateByUrl').mockResolvedValue(true);

    page.form.setValue({ username: 'alice', password: 'secret' });
    page.onSubmit();

    const loginReq = http.expectOne(`${environment.oauthBaseUrl}/login`);
    loginReq.flush({
      token_type: 'Bearer',
      access_token: 'tok-login',
      expires_in: 60,
    });
    await fixture.whenStable();

    expect(session.accessToken).toBe('tok-login');
    expect(navigateSpy).toHaveBeenCalledWith('/');
  });

  it('shows refusal-banner on 401 and retains form values', async () => {
    const { fixture, page } = createPage();

    page.form.setValue({ username: 'alice', password: 'bad' });
    page.onSubmit();

    const loginReq = http.expectOne(`${environment.oauthBaseUrl}/login`);
    loginReq.flush(
      { message: 'unauthorized' },
      { status: 401, statusText: 'Unauthorized' },
    );
    await fixture.whenStable();
    fixture.detectChanges();

    expect(page.bannerKind()).toBe('refusal');
    expect(page.bannerMessage()).toBe(
      'Não foi possível entrar. Verifique usuário e senha.',
    );
    expect(page.form.getRawValue()).toEqual({
      username: 'alice',
      password: 'bad',
    });
    expect(page.form.enabled).toBe(true);
    expect(session.accessToken).toBeNull();

    const alert = (fixture.nativeElement as HTMLElement).querySelector(
      '[role="alert"]',
    );
    expect(alert?.textContent).toContain(
      'Não foi possível entrar. Verifique usuário e senha.',
    );
  });

  it('shows identity-banner on 503 and retains form', async () => {
    const { fixture, page } = createPage();

    page.form.setValue({ username: 'alice', password: 'secret' });
    page.onSubmit();

    const loginReq = http.expectOne(`${environment.oauthBaseUrl}/login`);
    loginReq.flush(
      { message: 'down' },
      { status: 503, statusText: 'Service Unavailable' },
    );
    await fixture.whenStable();
    fixture.detectChanges();

    expect(page.bannerKind()).toBe('identity');
    expect(page.bannerMessage()).toBe('Identidade indisponível.');
    expect(page.form.getRawValue().username).toBe('alice');
    expect(session.accessToken).toBeNull();
  });

  it('shows identity-banner on network failure', async () => {
    const { fixture, page } = createPage();

    page.form.setValue({ username: 'alice', password: 'secret' });
    page.onSubmit();

    const loginReq = http.expectOne(`${environment.oauthBaseUrl}/login`);
    loginReq.error(new ProgressEvent('error'));
    await fixture.whenStable();
    fixture.detectChanges();

    expect(page.bannerKind()).toBe('identity');
    expect(page.bannerMessage()).toBe('Identidade indisponível.');
  });

  it('shows identity-banner on 502 without technical oauth copy', async () => {
    const { fixture, page } = createPage();

    page.form.setValue({ username: 'alice', password: 'secret' });
    page.onSubmit();

    const loginReq = http.expectOne(`${environment.oauthBaseUrl}/login`);
    loginReq.flush(
      { message: 'bad gateway' },
      { status: 502, statusText: 'Bad Gateway' },
    );
    await fixture.whenStable();
    fixture.detectChanges();

    expect(page.bannerKind()).toBe('identity');
    expect(page.bannerMessage()).toBe('Identidade indisponível.');
  });

  it('shows identity-banner on unknown oauth status without leaking status text', async () => {
    const { fixture, page } = createPage();

    page.form.setValue({ username: 'alice', password: 'secret' });
    page.onSubmit();

    const loginReq = http.expectOne(`${environment.oauthBaseUrl}/login`);
    loginReq.flush(
      { message: 'boom' },
      { status: 500, statusText: 'Internal Server Error' },
    );
    await fixture.whenStable();
    fixture.detectChanges();

    expect(page.bannerKind()).toBe('identity');
    expect(page.bannerMessage()).toBe('Identidade indisponível.');
  });

  it('shows refusal-banner on empty credentials without calling oauth', async () => {
    const { fixture, page } = createPage();

    page.form.setValue({ username: '  ', password: '' });
    page.onSubmit();
    await fixture.whenStable();
    fixture.detectChanges();

    http.expectNone(`${environment.oauthBaseUrl}/login`);
    expect(page.bannerKind()).toBe('refusal');
    expect(page.bannerMessage()).toBe(
      'Não foi possível entrar. Verifique usuário e senha.',
    );
    expect(page.form.enabled).toBe(true);
  });

  it('renders Entrar CTA', () => {
    const { fixture } = createPage();
    const btn = (fixture.nativeElement as HTMLElement).querySelector(
      'button[type="submit"]',
    );
    expect(btn?.textContent?.trim()).toContain('Entrar');
  });
});
