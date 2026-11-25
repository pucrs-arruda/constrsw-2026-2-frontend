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
