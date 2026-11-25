import { BreakpointObserver, BreakpointState } from '@angular/cdk/layout';
import { TestBed } from '@angular/core/testing';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { BehaviorSubject, Observable, map, of } from 'rxjs';
import { ClassesApiService } from '../data/classes-api.service';
import {
  ClassItem,
  ClassPatchPayload,
  ClassesLookups,
  StudentLookup,
} from '../data/classes.models';
import { ClassDetailPage } from './class-detail.page';

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

const SAMPLE_STUDENTS: StudentLookup[] = [
  {
    id: 'stu-1',
    registration_number: '2024.1',
    name: 'Caio Mendes',
    email: 'caio@pucrs.br',
    enabled: true,
  },
  {
    id: 'stu-2',
    registration_number: '2024.2',
    name: 'Pedro Lima',
    email: 'pedro@pucrs.br',
    enabled: true,
  },
];

const SAMPLE_LOOKUPS: ClassesLookups = {
  courses: [{ id: 'crs-1', code: 'CS101', name: 'Eng. de Software' }],
  professors: [
    {
      _id: 'prof-1',
      employeeId: 'e-1',
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

describe('ClassDetailPage & ClassEnrollmentsTab (Stories 1.3 & 1.4)', () => {
  let compact$: BehaviorSubject<boolean>;
  let patchedPayload: ClassPatchPayload | null;

  beforeEach(async () => {
    compact$ = new BehaviorSubject(false);
    patchedPayload = null;

    const bpObserver = {
      isMatched: (q: string) => (q.includes('599') ? compact$.value : true),
      observe: (value: string | readonly string[]) => {
        const q = Array.isArray(value) ? String(value[0]) : String(value);
        const src = q.includes('599') ? compact$ : new BehaviorSubject(true);
        return src.pipe(
          map((matches) => ({ matches, breakpoints: {} })),
        ) as Observable<BreakpointState>;
      },
      ngOnDestroy: () => undefined,
    } as BreakpointObserver;

    const apiStub = {
      getClass: () => of(SAMPLE_CLASS),
      loadLookups: () => of(SAMPLE_LOOKUPS),
      listStudents: () => of(SAMPLE_STUDENTS),
      patchClass: (_id: string, payload: ClassPatchPayload) => {
        patchedPayload = payload;
        return of({
          ...SAMPLE_CLASS,
          studentIds: payload.studentIds ?? SAMPLE_CLASS.studentIds,
        });
      },
      deleteClass: () => of(undefined),
    };

    await TestBed.configureTestingModule({
      imports: [ClassDetailPage],
      providers: [
        provideAnimationsAsync(),
        provideRouter([]),
        { provide: BreakpointObserver, useValue: bpObserver },
        { provide: ClassesApiService, useValue: apiStub },
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              paramMap: convertToParamMap({ id: 'cls-1' }),
              queryParamMap: convertToParamMap({}),
            },
          },
        },
      ],
    }).compileComponents();
  });

  it('shows back link, turma summary chips, and all 3 Figma R07/R08 tabs (Alunos matriculados | Aulas | Reservas)', () => {
    const fixture = TestBed.createComponent(ClassDetailPage);
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('Voltar para Turmas');
    expect(el.textContent).toContain('Turma SE-A — Eng. de Software');
    expect(el.textContent).toContain('Período 2026/2');
    expect(el.textContent).toContain('Sala padrão B201');
    expect(el.textContent).toContain('40 vagas');

    const tabLabels = Array.from(el.querySelectorAll('[role="tab"]')).map((t) =>
      t.textContent?.trim(),
    );
    expect(tabLabels).toEqual(['Alunos matriculados', 'Aulas', 'Reservas']);
  });

  it('associates an existing Student via picker without any "Novo aluno" CTA and preserves tab state across viewport change', () => {
    const fixture = TestBed.createComponent(ClassDetailPage);
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).not.toContain('Novo aluno');
    expect(el.textContent).toContain('Caio Mendes');

    const openPickerBtn = Array.from(el.querySelectorAll('button')).find((b) =>
      b.textContent?.includes('Associar aluno existente'),
    );
    expect(openPickerBtn).toBeDefined();
    openPickerBtn!.click();
    fixture.detectChanges();

    expect(el.textContent).toContain('Escolher aluno já cadastrado');
    expect(el.textContent).toContain('Pedro Lima');

    const associateBtn = Array.from(el.querySelectorAll('button')).find(
      (b) => b.textContent?.trim() === 'Associar',
    );
    expect(associateBtn).toBeDefined();
    associateBtn!.click();
    fixture.detectChanges();

    expect(patchedPayload).toEqual({ studentIds: ['stu-1', 'stu-2'] });
    expect(fixture.componentInstance.classItem()?.studentIds).toEqual([
      'stu-1',
      'stu-2',
    ]);

    // Switching to compact viewport preserves selected tab
    fixture.componentInstance.onTabIndexChange(2);
    compact$.next(true);
    fixture.detectChanges();
    expect(fixture.componentInstance.selectedTabIndex()).toBe(2);
  });

  it('asks confirmation before disassociating an enrolled student', () => {
    const dialog = TestBed.inject(MatDialog);
    let confirmOpened = false;
    dialog.open = (() => {
      confirmOpened = true;
      return { afterClosed: () => of(true) } as MatDialogRef<unknown>;
    }) as typeof dialog.open;

    const fixture = TestBed.createComponent(ClassDetailPage);
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    const deleteBtn = Array.from(el.querySelectorAll('button')).find(
      (b) => b.textContent?.trim() === 'Excluir',
    );
    // Find the table row delete button (second Excluir; first is header Delete class)
    const allExcluir = Array.from(el.querySelectorAll('button')).filter(
      (b) => b.textContent?.trim() === 'Excluir',
    );
    expect(deleteBtn).toBeDefined();
    expect(allExcluir.length).toBeGreaterThanOrEqual(2);
    allExcluir[allExcluir.length - 1]!.click();
    fixture.detectChanges();

    expect(confirmOpened).toBe(true);
    expect(patchedPayload).toEqual({ studentIds: [] });
  });
});
