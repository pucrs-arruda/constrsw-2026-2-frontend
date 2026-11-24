import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { APP_CONFIG } from '../../core/config/app-config';
import { CoursesPage } from './courses.page';

const base = '/gateway/api/v1/courses';
const course = {
  id: 'disc-1',
  code: 'CS-01',
  name: 'Construção',
  workloadHours: 60,
  bibliographicReferences: [],
  syllabusItems: [],
  classes: [{ id: 'class-1', label: 'Turma A', code: 'A', year: 2026, semester: 2, seats: 30 }],
};

describe('Disciplinas', () => {
  let http: HttpTestingController;
  let router: RouterTestingHarness;

  beforeEach(async () => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([
          { path: 'disciplinas', component: CoursesPage },
          { path: 'disciplinas/:id', component: CoursesPage },
        ]),
        { provide: APP_CONFIG, useValue: { bffBaseUrl: '/gateway/' } },
      ],
    });
    http = TestBed.inject(HttpTestingController);
    router = await RouterTestingHarness.create();
  });
  afterEach(() => http.verify());

  it('mostra skeleton, filtra por nome sem acento e oferece limpar a busca', async () => {
    const page = await router.navigateByUrl('/disciplinas', CoursesPage);
    expect(router.routeNativeElement!.querySelector('app-skeleton')).toBeTruthy();
    const request = http.expectOne(base);
    expect(request.request.withCredentials).toBe(true);
    request.flush([course]);
    page.search.set('construcao');
    router.detectChanges();
    expect(router.routeNativeElement!.textContent).toContain('CS-01');
    page.search.set('inexistente');
    router.detectChanges();
    expect(router.routeNativeElement!.textContent).toContain('Nenhuma disciplina encontrada.');
    router.routeNativeElement!.querySelector<HTMLButtonElement>('app-empty-state button')!.click();
    expect(page.search()).toBe('');
  });

  it('exibe as turmas do GET composto e descarta os dados ao receber 503', async () => {
    const page = await router.navigateByUrl('/disciplinas/disc-1', CoursesPage);
    http.expectOne(base + '/disc-1').flush(course);
    router.detectChanges();
    expect(router.routeNativeElement!.textContent).toContain('Turma A');
    page.reload();
    http.expectOne(base + '/disc-1').flush({}, { status: 503, statusText: 'Unavailable' });
    router.detectChanges();
    expect(router.routeNativeElement!.textContent).toContain('Serviço de composição indisponível.');
    expect(router.routeNativeElement!.textContent).not.toContain('Turma A');
    router.routeNativeElement!.querySelector<HTMLButtonElement>('app-error-banner button')!.click();
    http.expectOne(base + '/disc-1').flush(course);
    router.detectChanges();
    expect(router.routeNativeElement!.textContent).toContain('Turma A');
  });

  it('cancela a consulta anterior ao abrir outra disciplina', async () => {
    await router.navigateByUrl('/disciplinas/disc-1', CoursesPage);
    const original = http.expectOne(base + '/disc-1');
    await router.navigateByUrl('/disciplinas/disc-2', CoursesPage);
    expect(original.cancelled).toBe(true);
    http.expectOne(base + '/disc-2').flush({ ...course, id: 'disc-2', name: 'Outra disciplina' });
    router.detectChanges();
    expect(router.routeNativeElement!.querySelector('h1')!.textContent.trim()).toBe(
      'Outra disciplina',
    );
  });
});
