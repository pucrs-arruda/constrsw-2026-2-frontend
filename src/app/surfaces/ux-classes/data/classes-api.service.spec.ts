import { HttpErrorResponse, provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import { BffRequestError } from '../../../shared/http';
import { ClassesApiService } from './classes-api.service';
import {
  ClassItem,
  extractProblemUiError,
  formatProfessorLabel,
} from './classes.models';

const SAMPLE_CLASS: ClassItem = {
  id: 'cls-1',
  enabled: true,
  courseId: 'crs-1',
  startDate: '2026-08-01',
  endDate: '2026-12-10',
  year: 2026,
  semester: 2,
  seats: 40,
  roomId: 'rm-1',
  professorId: 'prof-1',
  studentIds: ['stu-1'],
  code: 'SE-A',
  label: 'Eng. de Software',
  status: 'active',
  modality: 'presencial',
  averageRating: null,
};

describe('ClassesApiService', () => {
  let service: ClassesApiService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(ClassesApiService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('calls BFF /api/v1/classes endpoints for CRUD', async () => {
    const listPromise = firstValueFrom(service.listClasses());
    httpMock.expectOne('/api/v1/classes').flush([SAMPLE_CLASS]);
    expect(await listPromise).toEqual([SAMPLE_CLASS]);

    const getPromise = firstValueFrom(service.getClass('cls-1'));
    httpMock.expectOne('/api/v1/classes/cls-1').flush(SAMPLE_CLASS);
    expect(await getPromise).toEqual(SAMPLE_CLASS);

    const patchPromise = firstValueFrom(
      service.patchClass('cls-1', { studentIds: ['stu-1', 'stu-2'] }),
    );
    const patchReq = httpMock.expectOne('/api/v1/classes/cls-1');
    expect(patchReq.request.method).toBe('PATCH');
    expect(patchReq.request.body).toEqual({ studentIds: ['stu-1', 'stu-2'] });
    patchReq.flush({ ...SAMPLE_CLASS, studentIds: ['stu-1', 'stu-2'] });
    expect((await patchPromise).studentIds).toEqual(['stu-1', 'stu-2']);

    const delPromise = firstValueFrom(service.deleteClass('cls-1'));
    const delReq = httpMock.expectOne('/api/v1/classes/cls-1');
    expect(delReq.request.method).toBe('DELETE');
    delReq.flush(null, { status: 204, statusText: 'No Content' });
    await delPromise;
  });

  it('degrades lookups gracefully if auxiliary BFF routes fail', async () => {
    const promise = firstValueFrom(service.loadLookups());
    httpMock
      .expectOne('/api/v1/courses')
      .flush([{ id: 'crs-1', code: 'CS101', name: 'Eng. de Software' }]);
    httpMock
      .expectOne('/api/v1/professors')
      .flush('down', { status: 503, statusText: 'Unavailable' });
    httpMock
      .expectOne('/api/v1/rooms')
      .flush([
        {
          id: 'rm-1',
          code: 'B201',
          name: 'Sala B201',
          building: '32',
          capacity: 40,
          active: true,
        },
      ]);

    const lookups = await promise;
    expect(lookups.courses).toHaveLength(1);
    expect(lookups.professors).toEqual([]);
    expect(lookups.rooms).toHaveLength(1);
  });

  it('extracts RFC 9457 code + detail for refusals and composition copy for 503', () => {
    const err422 = new BffRequestError(
      {
        kind: 'refusal',
        bannerKind: 'refusal',
        message: 'fallback',
        status: 422,
      },
      new HttpErrorResponse({
        status: 422,
        error: {
          code: 'FR-13',
          detail: 'Sala padrão em colisão no período.',
        },
      }),
    );
    expect(extractProblemUiError(err422)).toEqual({
      kind: 'refusal',
      message: 'FR-13: Sala padrão em colisão no período.',
    });

    const err503 = new BffRequestError(
      {
        kind: 'composition',
        bannerKind: 'composition',
        message: 'Serviço de composição indisponível.',
        status: 503,
      },
      new HttpErrorResponse({ status: 503 }),
    );
    expect(extractProblemUiError(err503)).toEqual({
      kind: 'composition',
      message: 'Serviço de composição indisponível.',
    });
  });

  it('labels inactive professors clearly for FR-1a visibility', () => {
    const label = formatProfessorLabel('p-1', [
      {
        _id: 'p-1',
        employeeId: 'e-1',
        active: false,
        employeeName: 'Marina Silva',
      },
    ]);
    expect(label).toBe('Marina Silva (Inativo)');
  });
});
