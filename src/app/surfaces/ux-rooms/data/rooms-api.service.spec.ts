import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
  type TestRequest,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { APP_CONFIG } from '../../../shared/config/app-config';
import { RoomsApiService } from './rooms-api.service';
import type { AccessibilityFeature, RoomUpdate, RoomView } from './rooms.models';

const url = '/bff-teste/api/v1/rooms';
const roomUrl = `${url}/sala-1`;
const featuresUrl = `${roomUrl}/accessibility-features`;
const featureUrl = `${featuresUrl}/recurso-1`;
const roomBody: RoomUpdate = {
  code: 'LAB1',
  name: 'Laboratório 1',
  building: 'A',
  capacity: null,
  active: true,
  resourceIds: [],
};
const room: RoomView = { ...roomBody, id: 'sala-1', enabled: true, classes: [] };
const feature: AccessibilityFeature = {
  id: 'recurso-1',
  roomId: room.id,
  code: 'RAMPA',
  present: false,
  description: null,
  enabled: true,
};

function notFound(request: TestRequest): void {
  request.flush(null, { status: 404, statusText: 'Not Found' });
}

describe('RoomsApiService', () => {
  let api: RoomsApiService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        {
          provide: APP_CONFIG,
          useValue: { bffBaseUrl: '/bff-teste/', oauthBaseUrl: '/auth-teste' },
        },
      ],
    });
    api = TestBed.inject(RoomsApiService);
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());

  it('usa X-Total-Count e envia os parâmetros de paginação', async () => {
    const result = firstValueFrom(api.list({ page: 0, size: 1 }));
    http.expectOne({ method: 'GET', url: `${url}?page=0&size=1` }).flush([room], {
      headers: { 'X-Total-Count': '11' },
    });
    await expect(result).resolves.toEqual({ items: [room], total: 11 });
  });

  it('usa o tamanho da lista sem X-Total-Count', async () => {
    const result = firstValueFrom(api.list({}));
    http.expectOne({ method: 'GET', url }).flush([room]);
    await expect(result).resolves.toEqual({ items: [room], total: 1 });
  });

  it('converte 404 de lista em página vazia', async () => {
    const result = firstValueFrom(api.list({}));
    notFound(http.expectOne({ method: 'GET', url }));
    await expect(result).resolves.toEqual({ items: [], total: 0 });
  });

  it('converte 404 de sala em ApiError', async () => {
    const result = firstValueFrom(api.get(room.id));
    notFound(http.expectOne({ method: 'GET', url: roomUrl }));
    await expect(result).rejects.toMatchObject({ kind: 'not-found', status: 404 });
  });

  it('envia só os campos definidos no POST de sala', async () => {
    const body = { code: room.code, name: room.name, building: room.building, active: false };
    const result = firstValueFrom(api.create({ ...body, capacity: undefined }));
    const req = http.expectOne({ method: 'POST', url });
    expect(req.request.body).toStrictEqual(body);
    req.flush(room);
    await expect(result).resolves.toEqual(room);
  });

  it('envia o PUT completo, inclusive capacity nula', async () => {
    const result = firstValueFrom(api.update(room.id, roomBody));
    const req = http.expectOne({ method: 'PUT', url: roomUrl });
    expect(req.request.body).toEqual(roomBody);
    req.flush(room);
    await expect(result).resolves.toEqual(room);
  });

  it('envia somente o objeto fornecido no PATCH e recusa corpo vazio', async () => {
    expect(() => api.patch(room.id, {})).toThrow('ao menos um campo');
    expect(() => api.patch(room.id, { capacity: undefined })).toThrow('ao menos um campo');
    const body = { capacity: null, active: false };
    const result = firstValueFrom(api.patch(room.id, body));
    const req = http.expectOne({ method: 'PATCH', url: roomUrl });
    expect(req.request.body).toBe(body);
    req.flush(room);
    await expect(result).resolves.toEqual(room);
  });

  it('em 404 de lista de características retorna vazio se a sala existe', async () => {
    const result = firstValueFrom(api.listFeatures(room.id));
    notFound(http.expectOne({ method: 'GET', url: featuresUrl }));
    http.expectOne({ method: 'GET', url: roomUrl }).flush(room);
    await expect(result).resolves.toEqual({ items: [], total: 0 });
  });

  it('em 404 de lista de características propaga not-found se a sala não existe', async () => {
    const result = firstValueFrom(api.listFeatures(room.id));
    notFound(http.expectOne({ method: 'GET', url: featuresUrl }));
    notFound(http.expectOne({ method: 'GET', url: roomUrl }));
    await expect(result).rejects.toMatchObject({ kind: 'not-found', status: 404 });
  });

  it('preserva falha de composição ao confirmar se a sala existe', async () => {
    const result = firstValueFrom(api.listFeatures(room.id));
    notFound(http.expectOne({ method: 'GET', url: featuresUrl }));
    http.expectOne({ method: 'GET', url: roomUrl }).flush(
      { code: 'BFF-DEPENDENCY' },
      {
        status: 503,
        statusText: 'Service Unavailable',
        headers: { 'Content-Type': 'application/problem+json' },
      },
    );
    await expect(result).rejects.toMatchObject({ kind: 'composition-unavailable', status: 503 });
  });

  it('codifica os filtros da lista de características e lê a paginação', async () => {
    const result = firstValueFrom(
      api.listFeatures(room.id, {
        filters: [{ field: 'description', op: 'like', value: 'rampa' }],
      }),
    );
    http
      .expectOne({
        method: 'GET',
        url: `${featuresUrl}?description=%7Blike%7D%25rampa%25`,
      })
      .flush([feature], { headers: { 'X-Total-Count': '2' } });
    await expect(result).resolves.toEqual({ items: [feature], total: 2 });
  });

  it('usa as rotas e os corpos de leitura e escrita de características', async () => {
    expect(() => api.patchFeature(room.id, feature.id, {})).toThrow('ao menos um campo');
    const update = { code: feature.code, description: null, present: false };
    const patch = { present: false };
    const cases = [
      { result: api.getFeature(room.id, feature.id), method: 'GET', url: featureUrl, body: null },
      {
        result: api.createFeature(room.id, { code: feature.code, present: undefined }),
        method: 'POST',
        url: featuresUrl,
        body: { code: feature.code },
      },
      {
        result: api.updateFeature(room.id, feature.id, update),
        method: 'PUT',
        url: featureUrl,
        body: update,
      },
      {
        result: api.patchFeature(room.id, feature.id, patch),
        method: 'PATCH',
        url: featureUrl,
        body: patch,
      },
    ];
    for (const { result, method, url, body } of cases) {
      const pending = firstValueFrom(result);
      const req = http.expectOne({ method, url });
      expect(req.request.body).toStrictEqual(body);
      req.flush(feature);
      await expect(pending).resolves.toEqual(feature);
    }
  });

  it('converte ambos os DELETE 204 em void', async () => {
    for (const [target, request] of [
      [roomUrl, api.remove(room.id)],
      [featureUrl, api.removeFeature(room.id, feature.id)],
    ] as const) {
      const result = firstValueFrom(request);
      http
        .expectOne({ method: 'DELETE', url: target })
        .flush(null, { status: 204, statusText: 'No Content' });
      await expect(result).resolves.toBeUndefined();
    }
  });
});
