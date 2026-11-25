import { HttpErrorResponse } from '@angular/common/http';
import {
  BFF_BANNER_MESSAGES,
  formatBffProblemMessage,
  mapBffHttpError,
} from './bff-error';

function httpErr(
  status: number,
  error?: unknown,
): HttpErrorResponse {
  return new HttpErrorResponse({
    status,
    statusText: status === 0 ? 'Unknown Error' : 'Error',
    url: '/api/v1/employees',
    error,
  });
}

describe('mapBffHttpError', () => {
  it('maps 401 to unauthorized with refusal banner kind', () => {
    const mapped = mapBffHttpError(httpErr(401));
    expect(mapped.kind).toBe('unauthorized');
    expect(mapped.bannerKind).toBe('refusal');
    expect(mapped.status).toBe(401);
    expect(mapped.message.length).toBeGreaterThan(0);
  });

  it('maps 503 to composition by default (T3; no client join)', () => {
    const mapped = mapBffHttpError(httpErr(503));
    expect(mapped.kind).toBe('composition');
    expect(mapped.bannerKind).toBe('composition');
    expect(mapped.message).toBe(BFF_BANNER_MESSAGES.composition);
    expect(mapped.message).toBe('Serviço de composição indisponível.');
  });

  it('maps 503 to identity when service option is identity', () => {
    const mapped = mapBffHttpError(httpErr(503), { service: 'identity' });
    expect(mapped.kind).toBe('identity');
    expect(mapped.bannerKind).toBe('identity');
    expect(mapped.message).toBe('Identidade indisponível.');
  });

  it('maps status 0 / 502 / 504 as composition outage by default', () => {
    for (const status of [0, 502, 504]) {
      const mapped = mapBffHttpError(httpErr(status));
      expect(mapped.kind).toBe('composition');
      expect(mapped.message).toBe(BFF_BANNER_MESSAGES.composition);
    }
  });

  it('maps other statuses to refusal', () => {
    const mapped = mapBffHttpError(httpErr(409), {
      refusalMessage: 'E-mail já cadastrado.',
    });
    expect(mapped.kind).toBe('refusal');
    expect(mapped.bannerKind).toBe('refusal');
    expect(mapped.message).toBe('E-mail já cadastrado.');
  });

  it('409 with detail+code includes detail and pt-BR code label', () => {
    const mapped = mapBffHttpError(
      httpErr(409, {
        detail: 'E-mail já cadastrado para outro funcionário.',
        title: 'Conflict',
        code: 'conflict',
      }),
    );
    expect(mapped.kind).toBe('refusal');
    expect(mapped.message).toBe(
      'E-mail já cadastrado para outro funcionário. (conflito)',
    );
  });

  it('prefers detail over title for refusal message', () => {
    const mapped = mapBffHttpError(
      httpErr(400, {
        detail: 'Matrícula inválida.',
        title: 'Bad Request',
        code: 'validation',
      }),
    );
    expect(mapped.message).toContain('Matrícula inválida.');
    expect(mapped.message).not.toContain('Bad Request');
    expect(mapped.message).toContain('validação');
  });

  it('options.refusalMessage still wins over problem body', () => {
    const mapped = mapBffHttpError(
      httpErr(409, {
        detail: 'E-mail já cadastrado para outro funcionário.',
        code: 'conflict',
      }),
      { refusalMessage: 'Mensagem institucional fixa.' },
    );
    expect(mapped.message).toBe('Mensagem institucional fixa.');
  });
});

describe('formatBffProblemMessage', () => {
  it('returns detail with pt-BR code label when code not already in text', () => {
    const message = formatBffProblemMessage(
      httpErr(409, {
        detail: 'Operação recusada.',
        title: 'Conflict',
        code: 'conflict',
      }),
    );
    expect(message).toBe('Operação recusada. (conflito)');
  });

  it('does not duplicate label when already present in detail', () => {
    const message = formatBffProblemMessage(
      httpErr(409, {
        detail: 'Recusa por conflito de e-mail.',
        code: 'conflict',
      }),
    );
    expect(message).toBe('Recusa por conflito de e-mail.');
  });

  it('falls back to title when detail is absent', () => {
    const message = formatBffProblemMessage(
      httpErr(400, { title: 'E-mail duplicado', code: 'conflict' }),
    );
    expect(message).toBe('E-mail duplicado (conflito)');
  });

  it('parses JSON string error bodies', () => {
    const message = formatBffProblemMessage(
      httpErr(409, JSON.stringify({ detail: 'E-mail já cadastrado', code: 'conflict' })),
    );
    expect(message).toBe('E-mail já cadastrado (conflito)');
  });

  it('returns null when body has neither detail nor title', () => {
    expect(formatBffProblemMessage(httpErr(500, { code: 'internal' }))).toBeNull();
    expect(formatBffProblemMessage(httpErr(500))).toBeNull();
  });
});
