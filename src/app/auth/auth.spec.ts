import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import {
  ActivatedRouteSnapshot,
  RedirectCommand,
  Router,
  RouterStateSnapshot,
  provideRouter,
} from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { APP_CONFIG } from '../shared/config/app-config';
import { authGuard } from './auth.guard';
import { authInterceptor } from './auth.interceptor';
import { AuthService } from './auth.service';

const oauth = '/api/auth';
const bff = '/api/bff';
const identityUrl = bff + '/api/v1/identidade/me';
const rooms = bff + '/api/v1/rooms';
const identity = { sub: 'user', email: 'user@pucrs.br', papeis: ['administrator'] };
const created = { status: 201, statusText: 'Created' };
const unauthorized = { status: 401, statusText: 'Unauthorized' };
const unavailable = { status: 503, statusText: 'Service Unavailable' };

describe('Autenticação OAuth e BFF', () => {
  let auth: AuthService;
  let http: HttpTestingController;
  let client: HttpClient;
  let router: Router;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
        { provide: APP_CONFIG, useValue: { oauthBaseUrl: oauth, bffBaseUrl: bff } },
      ],
    });
    auth = TestBed.inject(AuthService);
    http = TestBed.inject(HttpTestingController);
    client = TestBed.inject(HttpClient);
    router = TestBed.inject(Router);
    vi.spyOn(router, 'navigate').mockResolvedValue(true);
  });

  afterEach(() => http.verify());

  function guard(url: string) {
    return TestBed.runInInjectionContext(() =>
      authGuard({} as ActivatedRouteSnapshot, { url } as RouterStateSnapshot),
    );
  }

  it('envia multipart com credenciais e leva o Bearer do 201 à consulta de identidade', async () => {
    const login = auth.login(identity.email, 'senha de teste');
    await Promise.resolve();
    await Promise.resolve();
    const request = http.expectOne({ method: 'POST', url: oauth + '/login' });
    expect(request.request.withCredentials).toBe(true);
    expect(request.request.body.get('username')).toBe(identity.email);
    expect(request.request.body.get('password')).toBe('senha de teste');
    expect(request.request.headers.has('Authorization')).toBe(false);
    request.flush({ access_token: 'novo' }, created);
    await Promise.resolve();
    await Promise.resolve();

    const lookup = http.expectOne(identityUrl);
    expect(lookup.request.withCredentials).toBe(true);
    expect(lookup.request.headers.get('Authorization')).toBe('Bearer novo');
    lookup.flush(identity);
    await login;
    expect(auth.identity()).toEqual(identity);
    expect(auth.isAuthenticated()).toBe(true);
  });

  it.each([
    [400, 'validation', 'Informe o usuário.'],
    [401, 'invalid', 'Não foi possível entrar. Verifique usuário e senha.'],
    [503, 'unavailable', 'Identidade indisponível.'],
    [0, 'unavailable', 'Identidade indisponível.'],
  ] as const)('mapeia a falha %i no login e não chama refresh', async (status, kind, message) => {
    const login = auth.login(identity.email, 'senha de teste');
    const rejection = expect(login).rejects.toEqual({ kind, message });
    await Promise.resolve();
    await Promise.resolve();

    const request = http.expectOne(oauth + '/login');
    if (status === 0) {
      request.error(new ProgressEvent('error'));
    } else {
      request.flush({ error_description: 'Informe o usuário.' }, { status, statusText: 'Erro' });
    }
    await rejection;
    http.expectNone(oauth + '/refresh');
    expect(auth.isAuthenticated()).toBe(false);
  });

  it.each([
    ['administrator', true, true],
    ['coordinator', false, true],
    ['professor', false, false],
    ['student', false, false],
  ] as const)('deriva as permissões do papel %s', async (papel, admin, allClasses) => {
    const result = auth.loadIdentity();
    http.expectOne(identityUrl).flush({ ...identity, papeis: [papel] });
    await result;
    expect(auth.isAdmin()).toBe(admin);
    expect(auth.seesAllClasses()).toBe(allClasses);
  });

  it('coordena 401 simultâneos e atrasados com um refresh e um retry por chamada', async () => {
    const calls = [rooms, rooms + '/1', rooms + '/2'];
    const results = calls.map((url) => firstValueFrom(client.get(url)));
    const initial = calls.map((url) => http.expectOne(url));
    initial[0].flush(null, unauthorized);
    initial[1].flush(null, unauthorized);

    const refresh = http.expectOne({ method: 'POST', url: oauth + '/refresh' });
    expect(refresh.request.body).toBeNull();
    expect(refresh.request.withCredentials).toBe(true);
    refresh.flush({ access_token: 'renovado' }, created);

    // Aguarda o compartilhamento do refresh sem acoplar o teste à fila de microtarefas.
    await vi.waitFor(() => {
      expect(
        http
          .match((req) => req.headers.get('Authorization') === 'Bearer renovado')
          .map((request) => {
            request.flush({ ok: true });
            return request.request.url;
          }),
      ).toEqual(calls.slice(0, 2));
    });
    initial[2].flush(null, unauthorized);
    const lateRetry = http.expectOne(calls[2]);
    expect(lateRetry.request.headers.get('Authorization')).toBe('Bearer renovado');
    lateRetry.flush({ ok: true });

    expect(await Promise.all(results)).toEqual(calls.map(() => ({ ok: true })));
    http.expectNone(oauth + '/refresh');
  });

  it.each([false, true])(
    'redireciona ao expirar a sessão (refresh aceito: %s)',
    async (refreshAccepted) => {
      vi.spyOn(router, 'url', 'get').mockReturnValue('/salas/1');
      const result = firstValueFrom(client.get(rooms));
      const rejection = expect(result).rejects.toMatchObject({ status: 401 });
      http.expectOne(rooms).flush(null, unauthorized);
      const refresh = http.expectOne(oauth + '/refresh');
      if (refreshAccepted) {
        refresh.flush({ access_token: 'renovado' }, created);
        await vi.waitFor(() => http.expectOne(rooms).flush(null, unauthorized));
      } else {
        refresh.flush(null, unauthorized);
      }
      await rejection;
      http.expectNone(oauth + '/refresh');
      http.expectNone(oauth + '/logout');
      expect(auth.accessToken()).toBeNull();
      expect(router.navigate).toHaveBeenCalledWith(['/login'], {
        queryParams: { returnUrl: '/salas/1' },
      });
    },
  );

  it('não envia credenciais para um caminho de prefixo apenas parecido com o da BFF', async () => {
    const url = bff + '-externo/rooms';
    const result = firstValueFrom(client.get(url));
    const request = http.expectOne(url);
    expect(request.request.withCredentials).toBe(false);
    expect(request.request.headers.has('Authorization')).toBe(false);
    request.flush({});
    await result;
  });

  it('redireciona da rota protegida sem sessão e preserva o destino', async () => {
    const result = guard('/salas/1?aba=recursos');
    http.expectOne(oauth + '/refresh').flush(null, unauthorized);
    expect(router.serializeUrl((await result) as ReturnType<Router['parseUrl']>)).toBe(
      '/login?returnUrl=%2Fsalas%2F1%3Faba%3Drecursos',
    );
  });

  it('restaura o Bearer após recarregar e carrega a identidade antes de ativar a rota', async () => {
    const result = guard('/salas');
    http.expectOne(oauth + '/refresh').flush({ access_token: 'restaurado' }, created);
    await vi.waitFor(() => {
      const lookup = http.expectOne(identityUrl);
      expect(lookup.request.headers.get('Authorization')).toBe('Bearer restaurado');
      lookup.flush(identity);
    });
    expect(await result).toBe(true);
    expect(auth.identity()).toEqual(identity);
  });

  it('leva o erro indisponível à tela de login', async () => {
    const result = guard('/salas');
    http.expectOne(oauth + '/refresh').flush({ access_token: 'restaurado' }, created);
    await vi.waitFor(() => http.expectOne(identityUrl).flush(null, unavailable));
    const redirect = (await result) as RedirectCommand;
    expect(redirect.navigationBehaviorOptions?.state).toEqual({
      authError: 'Identidade indisponível.',
    });
  });

  it('encerra a sessão local e navega mesmo quando o logout falha na rede', async () => {
    const refresh = auth.refresh();
    http.expectOne(oauth + '/refresh').flush({ access_token: 'anterior' }, created);
    await refresh;
    const lookup = auth.loadIdentity();
    http.expectOne(identityUrl).flush(identity);
    await lookup;

    const result = auth.logout();
    expect(auth.accessToken()).toBeNull();
    expect(auth.identity()).toBeNull();
    await Promise.resolve();
    const request = http.expectOne({ method: 'POST', url: oauth + '/logout' });
    expect(request.request.withCredentials).toBe(true);
    request.error(new ProgressEvent('error'));
    await result;
    expect(router.navigate).toHaveBeenCalledWith(['/login']);
  });
});
