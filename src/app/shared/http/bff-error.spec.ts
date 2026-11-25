import { HttpErrorResponse } from '@angular/common/http';
import { BFF_BANNER_MESSAGES, mapBffHttpError } from './bff-error';

function httpErr(status: number): HttpErrorResponse {
  return new HttpErrorResponse({
    status,
    statusText: status === 0 ? 'Unknown Error' : 'Error',
    url: '/api/v1/employees',
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
});
