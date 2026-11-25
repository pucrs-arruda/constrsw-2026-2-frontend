import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { loginDestination } from './login.page';

describe('Destino após o login', () => {
  let router: Router;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
    router = TestBed.inject(Router);
  });

  it('preserva rota interna com parâmetros e fragmento', () => {
    const url = '/salas/123?aba=recursos#lista';
    expect(router.serializeUrl(loginDestination(router, url))).toBe(url);
  });

  it.each([
    null,
    'https://outro.example',
    '//outro.example',
    '/\\outro.example',
    '/%2Foutro.example',
    '/login;foo=1',
  ])('usa a lista de salas quando o destino é %s', (url) =>
    expect(router.serializeUrl(loginDestination(router, url))).toBe('/salas'),
  );
});
