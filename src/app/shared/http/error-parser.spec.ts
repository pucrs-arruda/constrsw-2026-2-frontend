import { HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { describe, expect, it } from 'vitest';
import { toApiError } from './error-parser';

describe('toApiError', () => {
  const problemHeaders = new HttpHeaders({
    'Content-Type': 'application/problem+json; charset=utf-8',
  });

  it('distingue falha de composição', () => {
    const err = new HttpErrorResponse({
      status: 503,
      headers: problemHeaders,
      error: { code: 'BFF-DEPENDENCY', detail: 'Falha nas turmas.' },
    });
    expect(toApiError(err)).toMatchObject({
      kind: 'composition-unavailable',
      status: 503,
      code: 'BFF-DEPENDENCY',
      message: 'Serviço de composição indisponível.',
    });
  });

  it('usa o detalhe de outros problemas', () => {
    const err = new HttpErrorResponse({
      status: 401,
      headers: problemHeaders,
      error: { title: 'Acesso recusado', detail: 'Entre novamente.' },
    });
    expect(toApiError(err)).toMatchObject({ kind: 'unauthorized', message: 'Entre novamente.' });
  });

  it.each([
    [409, 'conflict'],
    [400, 'validation'],
    [503, 'domain'],
  ])('preserva o envelope de domínio com HTTP %s', (status, kind) => {
    const error = { error_code: `RM-${status}`, error_description: 'Descrição do domínio' };
    expect(toApiError(new HttpErrorResponse({ status, error }))).toEqual({
      kind,
      status,
      code: error.error_code,
      message: error.error_description,
      raw: error,
    });
  });

  it('trata 403 sem mensagem útil', () => {
    expect(toApiError(new HttpErrorResponse({ status: 403 }))).toMatchObject({
      kind: 'forbidden',
      message: 'Você não tem permissão para esta ação.',
    });
  });

  it('trata falha de rede', () => {
    expect(toApiError(new HttpErrorResponse({ status: 0 }))).toMatchObject({
      kind: 'network',
      message: 'Não foi possível conectar. Verifique sua conexão.',
    });
  });
});
