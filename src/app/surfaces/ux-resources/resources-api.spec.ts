import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../environments/environment';
import { BffRequestError } from '../../shared/http';
import {
  ResourcesApi,
  type ResourceAggregateView,
  type ResourceView,
} from './resources-api';

const RESOURCE: ResourceView = {
  id: '6f1c2a54-0d0e-4a7e-9a52-2f0f1f7f0a01',
  code: 'PROJ-01',
  name: 'Projetor 4K',
  type: 'PROJECTOR',
  active: true,
  tags: ['av'],
  createdAt: '2026-11-01T10:00:00Z',
  updatedAt: '2026-11-01T10:00:00Z',
  openOccurrenceCount: 1,
  reservations: [],
};

describe('ResourcesApi', () => {
  let api: ResourcesApi;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    api = TestBed.inject(ResourcesApi);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify();
  });

  it('lists resources from GET /api/v1/resources', () => {
    let result: ResourceView[] | undefined;
    api.list().subscribe((list) => (result = list));

    const req = http.expectOne(`${environment.bffBaseUrl}/v1/resources`);
    expect(req.request.method).toBe('GET');
    req.flush([RESOURCE]);

    expect(result).toEqual([RESOURCE]);
  });

  it('reads one aggregate from GET /api/v1/resources/{id}', () => {
    const aggregate: ResourceAggregateView = { ...RESOURCE, occurrences: [] };
    let result: ResourceAggregateView | undefined;
    api.getById(RESOURCE.id).subscribe((value) => (result = value));

    const req = http.expectOne(
      `${environment.bffBaseUrl}/v1/resources/${RESOURCE.id}`,
    );
    expect(req.request.method).toBe('GET');
    req.flush(aggregate);

    expect(result).toEqual(aggregate);
  });

  it('creates with POST /api/v1/resources', () => {
    api
      .create({ code: 'PROJ-02', name: 'Projetor', type: 'PROJECTOR' })
      .subscribe();

    const req = http.expectOne(`${environment.bffBaseUrl}/v1/resources`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({
      code: 'PROJ-02',
      name: 'Projetor',
      type: 'PROJECTOR',
    });
    req.flush(RESOURCE, { status: 201, statusText: 'Created' });
  });

  it('updates with PATCH /api/v1/resources/{id}', () => {
    api.patch(RESOURCE.id, { active: false }).subscribe();

    const req = http.expectOne(
      `${environment.bffBaseUrl}/v1/resources/${RESOURCE.id}`,
    );
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual({ active: false });
    req.flush({ ...RESOURCE, active: false });
  });

  it('registers an occurrence with POST .../occurrences', () => {
    api
      .createOccurrence(RESOURCE.id, {
        description: 'Lâmpada fraca',
        type: 'MALFUNCTION',
      })
      .subscribe();

    const req = http.expectOne(
      `${environment.bffBaseUrl}/v1/resources/${RESOURCE.id}/occurrences`,
    );
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({
      description: 'Lâmpada fraca',
      type: 'MALFUNCTION',
    });
    req.flush({}, { status: 201, statusText: 'Created' });
  });

  it('resolves an occurrence with PATCH { resolution }', () => {
    api.resolveOccurrence(RESOURCE.id, 'occ-1', 'Trocada').subscribe();

    const req = http.expectOne(
      `${environment.bffBaseUrl}/v1/resources/${RESOURCE.id}/occurrences/occ-1`,
    );
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual({ resolution: 'Trocada' });
    req.flush({});
  });

  it('soft-deletes a resource with DELETE /api/v1/resources/{id}', () => {
    api.remove(RESOURCE.id).subscribe();
    const req = http.expectOne(
      `${environment.bffBaseUrl}/v1/resources/${RESOURCE.id}`,
    );
    expect(req.request.method).toBe('DELETE');
    req.flush(null, { status: 204, statusText: 'No Content' });
  });

  it('soft-deletes an occurrence with DELETE .../occurrences/{id}', () => {
    api.removeOccurrence(RESOURCE.id, 'occ-1').subscribe();
    const req = http.expectOne(
      `${environment.bffBaseUrl}/v1/resources/${RESOURCE.id}/occurrences/occ-1`,
    );
    expect(req.request.method).toBe('DELETE');
    req.flush(null, { status: 204, statusText: 'No Content' });
  });

  it('maps a 503 composition failure to a composition BffRequestError', () => {
    let error: unknown;
    api.list().subscribe({ error: (err) => (error = err) });

    http
      .expectOne(`${environment.bffBaseUrl}/v1/resources`)
      .flush(
        { code: 'BFF-DEPENDENCY' },
        { status: 503, statusText: 'Service Unavailable' },
      );

    expect(error).toBeInstanceOf(BffRequestError);
    expect((error as BffRequestError).mapped.bannerKind).toBe('composition');
  });
});
