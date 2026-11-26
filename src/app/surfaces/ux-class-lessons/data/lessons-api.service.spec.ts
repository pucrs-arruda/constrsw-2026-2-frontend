import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { LessonsApiService } from './lessons-api.service';

describe('LessonsApiService — somente BFF', () => {
  let api: LessonsApiService;
  let http: HttpTestingController;
  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    api = TestBed.inject(LessonsApiService); http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());
  it('filtra por turma e trata o 404 de coleção filtrada como vazio', () => {
    let result: unknown;
    api.list('class-1').subscribe(value => result = value);
    const req = http.expectOne('/api/v1/lessons?classId=class-1');
    expect(req.request.method).toBe('GET');
    req.flush({ error_code: 'LE-404' }, { status: 404, statusText: 'Not Found' });
    expect(result).toEqual([]);
  });
  it('não transforma indisponibilidade em coleção vazia', () => {
    let failed = false;
    api.list('c').subscribe({ error: () => failed = true });
    http.expectOne('/api/v1/lessons?classId=c').flush({}, { status: 503, statusText: 'Unavailable' });
    expect(failed).toBe(true);
  });
  it('não esconde um 404 de rota ausente no BFF', () => {
    let failed = false;
    api.list('c').subscribe({ error: () => failed = true });
    http.expectOne('/api/v1/lessons?classId=c').flush({ message: 'Cannot GET' }, { status: 404, statusText: 'Not Found' });
    expect(failed).toBe(true);
  });
  it('gera apenas aulas, sem chamada de reservas', () => {
    api.generate('c').subscribe();
    const req = http.expectOne('/api/v1/lessons/generate');
    expect(req.request.method).toBe('POST'); expect(req.request.body).toEqual({ classId: 'c' }); req.flush([]);
    http.expectNone(request => request.url.includes('reservations'));
  });
  it('lê, cria, atualiza e exclui aulas com os campos do contrato', () => {
    const body = { classId: 'c', date: '2026-11-04', timeSlotId: 'H', modality: 'IN_PERSON' as const, hasAssessment: false };
    api.create(body).subscribe(); let req = http.expectOne('/api/v1/lessons');
    expect(req.request.method).toBe('POST'); expect(req.request.body).toEqual(body); req.flush({ id: 'l', ...body });
    api.get('l').subscribe(); req = http.expectOne('/api/v1/lessons/l'); expect(req.request.method).toBe('GET'); req.flush({ id: 'l' });
    api.update('l', { modality: 'REMOTE', hasAssessment: true }).subscribe(); req = http.expectOne('/api/v1/lessons/l');
    expect(req.request.method).toBe('PUT'); expect(req.request.body).toEqual({ modality: 'REMOTE', hasAssessment: true }); req.flush({ id: 'l' });
    api.remove('l').subscribe(); req = http.expectOne('/api/v1/lessons/l'); expect(req.request.method).toBe('DELETE'); req.flush(null, { status: 204, statusText: 'No Content' });
  });
  it('mantém os tópicos aninhados na aula', () => {
    const body = { order: 1, statement: 'Introdução' };
    api.createTopic('l', body).subscribe(); let req = http.expectOne('/api/v1/lessons/l/topics');
    expect(req.request.method).toBe('POST'); expect(req.request.body).toEqual(body); req.flush({ id: 't' });
    api.updateTopic('l', 't', body).subscribe(); req = http.expectOne('/api/v1/lessons/l/topics/t'); expect(req.request.method).toBe('PUT'); req.flush({ id: 't' });
    api.removeTopic('l', 't').subscribe(); req = http.expectOne('/api/v1/lessons/l/topics/t'); expect(req.request.method).toBe('DELETE'); req.flush(null);
  });
  it('busca o plano de ensino pelo BFF e escapa identificadores', () => {
    api.syllabus('course/id').subscribe(); const req = http.expectOne('/api/v1/courses/course%2Fid/syllabus-items'); req.flush([]);
    api.get('lesson/id').subscribe(); http.expectOne('/api/v1/lessons/lesson%2Fid').flush({});
  });
});
