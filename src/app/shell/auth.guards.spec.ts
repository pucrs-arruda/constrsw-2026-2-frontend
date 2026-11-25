import { provideHttpClient, withInterceptors } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import {
  GuardResult,
  provideRouter,
  Router,
  UrlTree,
} from '@angular/router';
import { firstValueFrom, isObservable } from 'rxjs';
import { environment } from '../../environments/environment';
import { authGuard } from './auth.guard';
import { AuthSession } from './auth-session';
import { bearerInterceptor } from './bearer.interceptor';
import { guestGuard } from './guest.guard';
import { SessionBootstrap } from './session-bootstrap';

describe('authGuard + guestGuard + SessionBootstrap', () => {
  let http: HttpTestingController;
  let session: AuthSession;
  let router: Router;
  let bootstrap: SessionBootstrap;

  beforeEach(() => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        provideRouter([
          { path: 'login', children: [] },
          { path: '', pathMatch: 'full', children: [] },
          { path: 'home', children: [] },
        ]),
        provideHttpClient(withInterceptors([bearerInterceptor])),
        provideHttpClientTesting(),
      ],
    });
    http = TestBed.inject(HttpTestingController);
    session = TestBed.inject(AuthSession);
    router = TestBed.inject(Router);
    bootstrap = TestBed.inject(SessionBootstrap);
    session.clear();
  });

  afterEach(() => {
    http.verify();
    session.clear();
  });

  async function runGuard(
    guard: typeof authGuard | typeof guestGuard,
  ): Promise<GuardResult> {
    const result = TestBed.runInInjectionContext(() =>
      guard({} as never, {} as never),
    );
    if (isObservable(result)) {
      return firstValueFrom(result);
    }
    return result;
  }

  it('authGuard: boot refresh 201 restores session and allows HOME', async () => {
    const resultPromise = runGuard(authGuard);
    const refreshReq = http.expectOne(`${environment.oauthBaseUrl}/refresh`);
    refreshReq.flush({
      token_type: 'Bearer',
      access_token: 'restored',
      expires_in: 60,
    });
    const result = await resultPromise;
    expect(result).toBe(true);
    expect(session.accessToken).toBe('restored');
  });

  it('authGuard: boot refresh fail redirects to LOGIN', async () => {
    const resultPromise = runGuard(authGuard);
    const refreshReq = http.expectOne(`${environment.oauthBaseUrl}/refresh`);
    refreshReq.flush(
      { message: 'unauthorized' },
      { status: 401, statusText: 'Unauthorized' },
    );
    const result = await resultPromise;
    expect(result instanceof UrlTree).toBe(true);
    expect(router.serializeUrl(result as UrlTree)).toBe('/login');
    expect(session.accessToken).toBeNull();
  });

  it('authGuard: existing memory token skips refresh', async () => {
    session.applyTokens({ access_token: 'mem' });
    const result = await runGuard(authGuard);
    expect(result).toBe(true);
    http.expectNone(`${environment.oauthBaseUrl}/refresh`);
  });

  it('guestGuard: authenticated user redirects to HOME', async () => {
    session.applyTokens({ access_token: 'mem' });
    const result = await runGuard(guestGuard);
    expect(result instanceof UrlTree).toBe(true);
    expect(router.serializeUrl(result as UrlTree)).toBe('/');
    http.expectNone(`${environment.oauthBaseUrl}/refresh`);
  });

  it('guestGuard: boot restore 201 redirects LOGIN → HOME', async () => {
    const resultPromise = runGuard(guestGuard);
    const refreshReq = http.expectOne(`${environment.oauthBaseUrl}/refresh`);
    refreshReq.flush({
      token_type: 'Bearer',
      access_token: 'cookie-tok',
      expires_in: 60,
    });
    const result = await resultPromise;
    expect(result instanceof UrlTree).toBe(true);
    expect(router.serializeUrl(result as UrlTree)).toBe('/');
    expect(session.accessToken).toBe('cookie-tok');
  });

  it('guestGuard: failed restore allows LOGIN', async () => {
    const resultPromise = runGuard(guestGuard);
    const refreshReq = http.expectOne(`${environment.oauthBaseUrl}/refresh`);
    refreshReq.error(new ProgressEvent('error'));
    const result = await resultPromise;
    expect(result).toBe(true);
    expect(session.accessToken).toBeNull();
  });

  it('SessionBootstrap runs refresh only once app-wide', async () => {
    const first = firstValueFrom(bootstrap.ensureSession());
    const second = firstValueFrom(bootstrap.ensureSession());

    const refreshReq = http.expectOne(`${environment.oauthBaseUrl}/refresh`);
    refreshReq.flush({
      token_type: 'Bearer',
      access_token: 'once',
      expires_in: 60,
    });

    expect(await first).toBe(true);
    expect(await second).toBe(true);
    http.expectNone(`${environment.oauthBaseUrl}/refresh`);

    // After boot completed, further ensureSession uses memory — no new refresh
    expect(await firstValueFrom(bootstrap.ensureSession())).toBe(true);
    http.expectNone(`${environment.oauthBaseUrl}/refresh`);
  });

  it('SessionBootstrap does not retry refresh after a failed boot', async () => {
    const first = firstValueFrom(bootstrap.ensureSession());
    const refreshReq = http.expectOne(`${environment.oauthBaseUrl}/refresh`);
    refreshReq.flush(
      { message: 'gone' },
      { status: 401, statusText: 'Unauthorized' },
    );
    expect(await first).toBe(false);

    expect(await firstValueFrom(bootstrap.ensureSession())).toBe(false);
    http.expectNone(`${environment.oauthBaseUrl}/refresh`);
  });
});
