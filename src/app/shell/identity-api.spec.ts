import { provideHttpClient, withInterceptors } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';
import { bearerInterceptor } from './bearer.interceptor';
import {
  IdentityApi,
  identityDisplayName,
  identityInitials,
} from './identity-api';

describe('IdentityApi', () => {
  let api: IdentityApi;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([bearerInterceptor])),
        provideHttpClientTesting(),
      ],
    });
    api = TestBed.inject(IdentityApi);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify();
  });

  it('GETs /api/v1/identidade/me', async () => {
    const promise = firstValueFrom(api.me());
    const req = http.expectOne(`${environment.bffBaseUrl}/v1/identidade/me`);
    expect(req.request.method).toBe('GET');
    req.flush({
      sub: 'alice',
      email: 'alice@pucrs.br',
      papeis: ['admin'],
      employeeId: 'e1',
      professorId: null,
      studentId: null,
    });
    const me = await promise;
    expect(me.email).toBe('alice@pucrs.br');
    expect(me.sub).toBe('alice');
  });
});

describe('identityDisplayName / identityInitials', () => {
  it('prefers email over sub for display', () => {
    expect(
      identityDisplayName({ sub: 'alice', email: 'alice@pucrs.br' }),
    ).toBe('alice@pucrs.br');
    expect(identityDisplayName({ sub: 'alice', email: null })).toBe('alice');
  });

  it('builds initials from email local-part', () => {
    expect(identityInitials({ sub: 'x', email: 'alice.silva@pucrs.br' })).toBe(
      'AS',
    );
    expect(identityInitials({ sub: 'bob', email: null })).toBe('BO');
  });
});
