import {
  HttpClient,
  provideHttpClient,
  withInterceptors,
} from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';
import { AuthSession } from './auth-session';
import { bearerInterceptor } from './bearer.interceptor';
import { OauthRequestError } from './oauth-api';

describe('AuthSession + bearerInterceptor', () => {
  let session: AuthSession;
  let http: HttpTestingController;
  let client: HttpClient;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([bearerInterceptor])),
        provideHttpClientTesting(),
      ],
    });
    session = TestBed.inject(AuthSession);
    http = TestBed.inject(HttpTestingController);
    client = TestBed.inject(HttpClient);
  });

  afterEach(() => {
    http.verify();
    session.clear();
  });

  it('stores access_token in memory on login success and attaches Bearer to BFF', async () => {
    const loginPromise = firstValueFrom(session.login('alice', 'secret'));
    const loginReq = http.expectOne(`${environment.oauthBaseUrl}/login`);
    expect(loginReq.request.method).toBe('POST');
    expect(loginReq.request.withCredentials).toBe(true);
    expect(loginReq.request.body).toBeInstanceOf(FormData);
    loginReq.flush({
      token_type: 'Bearer',
      access_token: 'tok-abc',
      expires_in: 60,
    });
    await loginPromise;

    expect(session.accessToken).toBe('tok-abc');
    expect(session.isAuthenticated).toBe(true);

    const bffPromise = firstValueFrom(
      client.get(`${environment.bffBaseUrl}/v1/employees`),
    );
    const bffReq = http.expectOne(`${environment.bffBaseUrl}/v1/employees`);
    expect(bffReq.request.headers.get('Authorization')).toBe('Bearer tok-abc');
    bffReq.flush([]);
    await bffPromise;
  });

  it('keeps session empty on login 401', async () => {
    const loginPromise = firstValueFrom(session.login('alice', 'bad')).catch(
      (e) => e,
    );

    const loginReq = http.expectOne(`${environment.oauthBaseUrl}/login`);
    loginReq.flush(
      { message: 'unauthorized' },
      { status: 401, statusText: 'Unauthorized' },
    );

    const err = await loginPromise;
    expect(err).toBeInstanceOf(OauthRequestError);
    expect((err as OauthRequestError).kind).toBe('credentials_rejected');
    expect(session.accessToken).toBeNull();
  });

  it('maps identity unavailable on login 503', async () => {
    const loginPromise = firstValueFrom(session.login('alice', 'secret')).catch(
      (e) => e,
    );
    const loginReq = http.expectOne(`${environment.oauthBaseUrl}/login`);
    loginReq.flush(
      { message: 'down' },
      { status: 503, statusText: 'Service Unavailable' },
    );
    const err = await loginPromise;
    expect(err).toBeInstanceOf(OauthRequestError);
    expect((err as OauthRequestError).kind).toBe('identity_unavailable');
    expect((err as OauthRequestError).message).toContain(
      'Identidade indisponível',
    );
    expect(session.accessToken).toBeNull();
  });

  it('replaces access token on refresh', async () => {
    session.applyTokens({ access_token: 'old' });
    const refreshPromise = firstValueFrom(session.refresh());
    const refreshReq = http.expectOne(`${environment.oauthBaseUrl}/refresh`);
    expect(refreshReq.request.withCredentials).toBe(true);
    refreshReq.flush({
      token_type: 'Bearer',
      access_token: 'new-tok',
      expires_in: 60,
    });
    await refreshPromise;
    expect(session.accessToken).toBe('new-tok');
  });

  it('clears session on logout and does not send Bearer to oauth', async () => {
    session.applyTokens({ access_token: 'tok-abc' });
    const logoutPromise = firstValueFrom(session.logout());
    const logoutReq = http.expectOne(`${environment.oauthBaseUrl}/logout`);
    expect(logoutReq.request.headers.has('Authorization')).toBe(false);
    logoutReq.flush({ status: 'signed_out' });
    await logoutPromise;
    expect(session.accessToken).toBeNull();
  });

  it('clears local session even when logout network fails', async () => {
    session.applyTokens({ access_token: 'tok-abc' });
    const logoutPromise = firstValueFrom(session.logout());
    const logoutReq = http.expectOne(`${environment.oauthBaseUrl}/logout`);
    logoutReq.error(new ProgressEvent('error'));
    await logoutPromise;
    expect(session.accessToken).toBeNull();
  });

  it('does not attach Bearer to oauth login URL', async () => {
    session.applyTokens({ access_token: 'tok-abc' });
    const promise = firstValueFrom(
      client.post(`${environment.oauthBaseUrl}/login`, new FormData(), {
        withCredentials: true,
      }),
    );
    const req = http.expectOne(`${environment.oauthBaseUrl}/login`);
    expect(req.request.headers.has('Authorization')).toBe(false);
    req.flush({
      token_type: 'Bearer',
      access_token: 'x',
      expires_in: 1,
    });
    await promise;
  });
});
