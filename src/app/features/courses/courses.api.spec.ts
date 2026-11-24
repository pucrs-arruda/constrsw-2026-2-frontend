import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { APP_CONFIG } from '../../core/config/app-config';
import { CoursesApi } from './courses.api';

describe('CoursesApi', () => {
  const base = '/api/bff/api/v1/courses';
  const fields = { code: 'CS', name: 'Construção', workloadHours: 60 };
  const reference = { title: 'Livro', authors: 'Autora', type: 'BASIC' as const };
  let http: HttpTestingController;
  let api: CoursesApi;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: APP_CONFIG, useValue: { bffBaseUrl: '/api/bff' } },
      ],
    });
    api = TestBed.inject(CoursesApi);
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());

  it('cria disciplina com referência inicial e envia só escalares na substituição', () => {
    api.create(fields, reference).subscribe();
    const create = http.expectOne({ url: base, method: 'POST' });
    expect(create.request.body).toEqual({ ...fields, bibliographicReferences: [reference] });
    expect(create.request.withCredentials).toBe(true);
    create.flush({ id: 'c' });
    api.update('c', fields).subscribe();
    const replace = http.expectOne({ url: base + '/c', method: 'PUT' });
    expect(replace.request.body).toEqual(fields);
    replace.flush({ id: 'c' });
  });

  it('mantém referências e itens sob a disciplina selecionada', () => {
    api.saveReference('c', reference, 'r').subscribe();
    const replace = http.expectOne({ url: base + '/c/bibliographic-references/r', method: 'PUT' });
    expect(replace.request.body).toEqual(reference);
    replace.flush({});
    const item = { order: 2, kind: 'CONTENT' as const, statement: 'Requisitos' };
    api.saveItem('c', item, 'i').subscribe();
    const patch = http.expectOne({ url: base + '/c/syllabus-items/i', method: 'PATCH' });
    expect(patch.request.body).toEqual(item);
    patch.flush({});
  });
});
