import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { BffRequestError } from '../../../shared/http';
import { AuthSession } from '../../../shell/auth-session';
import { bearerInterceptor } from '../../../shell/bearer.interceptor';
import { LessonsApiService } from './lessons-api.service';

describe('LessonsApiService — somente BFF', () => {
  let api: LessonsApiService;
  let http: HttpTestingController;
  let session: AuthSession;
  let navigate: ReturnType<typeof vi.fn>;
  beforeEach(() => {
    navigate = vi.fn().mockResolvedValue(true);
    TestBed.configureTestingModule({ providers: [provideHttpClient(withInterceptors([bearerInterceptor])),
      provideHttpClientTesting(), { provide: Router, useValue: { navigateByUrl: navigate } }] });
    api = TestBed.inject(LessonsApiService); http = TestBed.inject(HttpTestingController);
    session = TestBed.inject(AuthSession);
    session.applyTokens({ access_token: 'expired-token' });
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

  it('renova pelo OAuth e repete a leitura com o novo Bearer', () => {
    let result: unknown;
    api.get('l').subscribe(value => result = value);
    const first = http.expectOne('/api/v1/lessons/l');
    expect(first.request.headers.get('Authorization')).toBe('Bearer expired-token');
    first.flush({}, { status: 401, statusText: 'Unauthorized' });
    const refresh = http.expectOne('/oauth/refresh');
    expect(refresh.request.method).toBe('POST');
    expect(refresh.request.withCredentials).toBe(true);
    expect(refresh.request.headers.has('Authorization')).toBe(false);
    refresh.flush({ access_token: 'renewed-token' });
    const retry = http.expectOne('/api/v1/lessons/l');
    expect(retry.request.headers.get('Authorization')).toBe('Bearer renewed-token');
    retry.flush({ id: 'l' });
    expect(result).toEqual({ id: 'l' });
    expect(navigate).not.toHaveBeenCalled();
  });

  it.each([401, 503])('se o refresh falha com %s, limpa a sessão e retorna ao login', status => {
    let failure: BffRequestError | undefined;
    api.get('l').subscribe({ error: error => failure = error });
    http.expectOne('/api/v1/lessons/l').flush({}, { status: 401, statusText: 'Unauthorized' });
    http.expectOne('/oauth/refresh').flush({}, { status, statusText: 'Refresh failed' });
    expect(failure?.http.status).toBe(401);
    expect(session.accessToken).toBeNull();
    expect(navigate).toHaveBeenCalledWith('/login');
    http.expectNone('/api/v1/lessons/l');
  });

  it('um segundo 401 encerra a sessão sem entrar em ciclo de refresh', () => {
    let failed = false;
    api.get('l').subscribe({ error: () => failed = true });
    http.expectOne('/api/v1/lessons/l').flush({}, { status: 401, statusText: 'Unauthorized' });
    http.expectOne('/oauth/refresh').flush({ access_token: 'renewed-token' });
    http.expectOne('/api/v1/lessons/l').flush({}, { status: 401, statusText: 'Unauthorized' });
    expect(failed).toBe(true);
    expect(session.accessToken).toBeNull();
    expect(navigate).toHaveBeenCalledWith('/login');
    http.expectNone('/oauth/refresh');
  });

  it.each([403, 409, 503])('não repete escrita nem renova a sessão em resposta %s', status => {
    let failure: BffRequestError | undefined;
    api.generate('c').subscribe({ error: error => failure = error });
    http.expectOne('/api/v1/lessons/generate').flush({}, { status, statusText: 'Domain refusal' });
    expect(failure?.http.status).toBe(status);
    expect(session.accessToken).toBe('expired-token');
    expect(navigate).not.toHaveBeenCalled();
    http.expectNone('/oauth/refresh');
    http.expectNone('/api/v1/lessons/generate');
  });

  it('preserva o corpo da geração depois de um 401 e propaga a recusa sem novo refresh', () => {
    let failure: BffRequestError | undefined;
    api.generate('c').subscribe({ error: error => failure = error });
    http.expectOne('/api/v1/lessons/generate').flush({}, { status: 401, statusText: 'Unauthorized' });
    http.expectOne('/oauth/refresh').flush({ access_token: 'renewed-token' });
    const retry = http.expectOne('/api/v1/lessons/generate');
    expect(retry.request.method).toBe('POST');
    expect(retry.request.body).toEqual({ classId: 'c' });
    expect(retry.request.headers.get('Authorization')).toBe('Bearer renewed-token');
    retry.flush({ error_code: 'LE-409' }, { status: 409, statusText: 'Conflict' });
    expect(failure?.http.status).toBe(409);
    expect(session.accessToken).toBe('renewed-token');
    expect(navigate).not.toHaveBeenCalled();
    http.expectNone('/oauth/refresh');
  });

  it('duas recusas simultâneas compartilham um único refresh', () => {
    let completed = 0;
    api.get('l').subscribe(() => completed++);
    api.syllabus('c').subscribe(() => completed++);
    http.expectOne('/api/v1/lessons/l').flush({}, { status: 401, statusText: 'Unauthorized' });
    http.expectOne('/api/v1/courses/c/syllabus-items').flush({}, { status: 401, statusText: 'Unauthorized' });
    http.expectOne('/oauth/refresh').flush({ access_token: 'renewed-token' });
    http.expectOne('/api/v1/lessons/l').flush({ id: 'l' });
    http.expectOne('/api/v1/courses/c/syllabus-items').flush([]);
    expect(completed).toBe(2);
    expect(navigate).not.toHaveBeenCalled();
  });
});
