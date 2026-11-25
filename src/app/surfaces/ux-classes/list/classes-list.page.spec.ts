import { BreakpointObserver, BreakpointState } from '@angular/cdk/layout';
import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { Router, provideRouter } from '@angular/router';
import { BehaviorSubject, Observable, map, of, throwError } from 'rxjs';
import { BffRequestError } from '../../../shared/http';
import { ClassesApiService } from '../data/classes-api.service';
import { ClassItem, ClassesLookups } from '../data/classes.models';
import { ClassesListPage } from './classes-list.page';

const SAMPLE_CLASSES: ClassItem[] = [
  {
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
  },
];

const SAMPLE_LOOKUPS: ClassesLookups = {
  courses: [{ id: 'crs-1', code: 'CS101', name: 'Eng. de Software' }],
  professors: [
    {
      _id: 'prof-1',
      employeeId: 'emp-1',
      active: true,
      employeeName: 'Marina Silva',
    },
  ],
  rooms: [
    {
      id: 'rm-1',
      code: 'B201',
      name: 'Sala B201',
      building: '32',
      capacity: 40,
      active: true,
    },
  ],
};

describe('ClassesListPage (Story 1.1)', () => {
  let compact$: BehaviorSubject<boolean>;
  let fullColumns$: BehaviorSubject<boolean>;
  let apiStub: {
    listClasses: () => Observable<ClassItem[]>;
    loadLookups: () => Observable<ClassesLookups>;
    deleteClass: (id: string) => Observable<void>;
  };

  beforeEach(async () => {
    compact$ = new BehaviorSubject(false);
    fullColumns$ = new BehaviorSubject(true);

    const bpObserver = {
      isMatched: (q: string) =>
        q.includes('599')
          ? compact$.value
          : q.includes('1280')
            ? fullColumns$.value
            : false,
      observe: (value: string | readonly string[]) => {
        const q = Array.isArray(value) ? String(value[0]) : String(value);
        const src = q.includes('599')
          ? compact$
          : q.includes('1280')
            ? fullColumns$
            : new BehaviorSubject(false);
        return src.pipe(
          map((matches) => ({ matches, breakpoints: {} })),
        ) as Observable<BreakpointState>;
      },
      ngOnDestroy: () => undefined,
    } as BreakpointObserver;

    apiStub = {
      listClasses: () => of(SAMPLE_CLASSES),
      loadLookups: () => of(SAMPLE_LOOKUPS),
      deleteClass: () => of(undefined),
    };

    await TestBed.configureTestingModule({
      imports: [ClassesListPage],
      providers: [
        provideAnimationsAsync(),
        provideRouter([]),
        { provide: BreakpointObserver, useValue: bpObserver },
        { provide: ClassesApiService, useValue: apiStub },
      ],
    }).compileComponents();
  });

  it('renders Turmas table at expanded (1280px) with resolved labels and switches to 2-line list in compact (360px)', () => {
    const fixture = TestBed.createComponent(ClassesListPage);
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('h1')?.textContent?.trim()).toBe('Turmas');
    expect(el.querySelector('table[mat-table]')).not.toBeNull();
    expect(el.textContent).toContain('SE-A');
    expect(el.textContent).toContain('Eng. de Software');
    expect(el.textContent).toContain('2026/2');
    expect(el.textContent).toContain('B201');

    compact$.next(true);
    fullColumns$.next(false);
    fixture.detectChanges();
    expect(el.querySelector('table[mat-table]')).toBeNull();
    expect(el.querySelector('.rdt-list')).not.toBeNull();
    expect(el.textContent).toContain('Mais ações');
  });

  it('shows pt-BR empty state with Nova turma CTA when list is empty', () => {
    apiStub.listClasses = () => of([]);
    const fixture = TestBed.createComponent(ClassesListPage);
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('Nenhuma turma cadastrada ainda.');
    expect(el.textContent).toContain('Nova turma');
  });

  it('shows composition banner on 503 error', () => {
    apiStub.listClasses = () =>
      throwError(
        () =>
          new BffRequestError(
            {
              kind: 'composition',
              bannerKind: 'composition',
              message: 'Serviço de composição indisponível.',
              status: 503,
            },
            new HttpErrorResponse({ status: 503 }),
          ),
      );

    const fixture = TestBed.createComponent(ClassesListPage);
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('[role="alert"]')?.textContent).toContain(
      'Serviço de composição indisponível.',
    );
  });

  it('navigates to /turmas/:id when Abrir is triggered and confirms before deleting', () => {
    const router = TestBed.inject(Router);
    let navigatedTo: unknown[] | null = null;
    router.navigate = (commands: unknown[]) => {
      navigatedTo = commands;
      return Promise.resolve(true);
    };

    const dialog = TestBed.inject(MatDialog);
    let deletedId = '';
    apiStub.deleteClass = (id: string) => {
      deletedId = id;
      return of(undefined);
    };
    dialog.open = (() =>
      ({
        afterClosed: () => of(true),
      }) as MatDialogRef<unknown>) as typeof dialog.open;

    const fixture = TestBed.createComponent(ClassesListPage);
    fixture.detectChanges();

    const row = fixture.componentInstance.rows()[0]!;
    fixture.componentInstance.onOpenRow(row);
    expect(navigatedTo).toEqual(['/turmas', 'cls-1']);

    fixture.componentInstance.onDeleteRow(row);
    fixture.detectChanges();
    expect(deletedId).toBe('cls-1');
    expect(fixture.componentInstance.classes()).toHaveLength(0);
  });
});
