import type { HttpErrorResponse } from '@angular/common/http';
import type { ApiError, ApiErrorKind } from './api-error';

const kinds: Partial<Record<number, ApiErrorKind>> = {
  400: 'validation',
  401: 'unauthorized',
  403: 'forbidden',
  404: 'not-found',
  409: 'conflict',
  503: 'domain',
};

const messages: Partial<Record<number, string>> = {
  400: 'Verifique os dados informados.',
  401: 'Sua sessão expirou. Entre novamente.',
  403: 'Você não tem permissão para esta ação.',
  404: 'Registro não encontrado.',
  409: 'A solicitação entra em conflito com os dados existentes.',
  503: 'Serviço indisponível.',
};

function readText(body: unknown, key: string): string | undefined {
  if (typeof body !== 'object' || body === null) return undefined;
  const value = (body as Record<string, unknown>)[key];
  return typeof value === 'string' && value.trim() ? value : undefined;
}

export function toApiError(err: HttpErrorResponse): ApiError {
  const { status, error: raw } = err;
  if (status === 0) {
    return {
      kind: 'network',
      status,
      message: 'Não foi possível conectar. Verifique sua conexão.',
      raw,
    };
  }

  const problem = err.headers
    .get('Content-Type')
    ?.toLowerCase()
    .includes('application/problem+json');
  const problemCode = problem ? readText(raw, 'code') : undefined;
  if (problemCode === 'BFF-DEPENDENCY') {
    return {
      kind: 'composition-unavailable',
      status,
      code: problemCode,
      message: 'Serviço de composição indisponível.',
      raw,
    };
  }

  const envelopeCode = readText(raw, 'error_code');
  const envelopeMessage = envelopeCode ? readText(raw, 'error_description') : undefined;
  const problemMessage = problem ? (readText(raw, 'detail') ?? readText(raw, 'title')) : undefined;
  const code = problemCode ?? envelopeCode;

  return {
    kind: kinds[status] ?? 'unknown',
    status,
    ...(code === undefined ? {} : { code }),
    message:
      problemMessage ??
      envelopeMessage ??
      messages[status] ??
      'Não foi possível concluir a solicitação.',
    raw,
  };
}
