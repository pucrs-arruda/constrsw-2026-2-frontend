import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { Observable, of, throwError } from 'rxjs';
import { BffRequestError } from '../../../shared/http';
import { ClassesApiService } from '../data/classes-api.service';
import { ClassCreatePayload, ClassItem } from '../data/classes.models';
import { ClassFormDialog, ClassFormDialogData } from './class-form.dialog';

const CREATED_CLASS: ClassItem = {
  id: 'cls-new',
  enabled: true,
  courseId: 'crs-1',
  startDate: '2026-08-01',
  endDate: '2026-12-10',
  year: 2026,
  semester: 2,
  seats: 40,
  roomId: 'rm-1',
  professorId: 'prof-1',
  studentIds: [],
  code: 'SE-A',
  label: 'Eng. de Software',
  status: 'active',
  modality: 'presencial',
  averageRating: null,
};

describe('ClassFormDialog (Story 1.2)', () => {
  let closedWith: ClassItem | undefined;
  let createCall: ((payload: ClassCreatePayload) => Observable<ClassItem>);

  function setup(data: ClassFormDialogData) {
    closedWith = undefined;
    const dialogRef = {
      close: (value?: ClassItem) => {
        closedWith = value;
      },
    } as MatDialogRef<ClassFormDialog, ClassItem | undefined>;

    const apiStub = {
      createClass: (payload: ClassCreatePayload) => createCall(payload),
      patchClass: () => of(CREATED_CLASS),
    };

    return TestBed.configureTestingModule({
      imports: [ClassFormDialog],
      providers: [
        provideAnimationsAsync(),
        { provide: MAT_DIALOG_DATA, useValue: data },
        { provide: MatDialogRef, useValue: dialogRef },
        { provide: ClassesApiService, useValue: apiStub },
      ],
    }).compileComponents();
  }

  it('submits valid create payload and closes with created Class', async () => {
    let sent: ClassCreatePayload | null = null;
    createCall = (payload) => {
      sent = payload;
      return of(CREATED_CLASS);
    };

    await setup({
      mode: 'create',
      lookups: {
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
      },
    });

    const fixture = TestBed.createComponent(ClassFormDialog);
    fixture.detectChanges();

    fixture.componentInstance.form.patchValue({
      code: 'SE-A',
      label: 'Eng. de Software',
      courseId: 'crs-1',
      professorId: 'prof-1',
      roomId: 'rm-1',
      year: 2026,
      semester: 2,
      startDate: '2026-08-01',
      endDate: '2026-12-10',
      seats: 40,
    });
    fixture.componentInstance.onSubmit();
    fixture.detectChanges();

    expect(sent).toMatchObject({
      code: 'SE-A',
      courseId: 'crs-1',
      professorId: 'prof-1',
      roomId: 'rm-1',
      seats: 40,
    });
    expect(closedWith).toEqual(CREATED_CLASS);
  });

  it('retains form and renders refusal-banner on collision/FR-13/FR-1a refusal', async () => {
    createCall = () =>
      throwError(
        () =>
          new BffRequestError(
            {
              kind: 'refusal',
              bannerKind: 'refusal',
              message: 'Não foi possível concluir a operação.',
              status: 422,
            },
            new HttpErrorResponse({
              status: 422,
              error: {
                code: 'FR-13',
                detail: 'Conflito de sala padrão no período informado.',
              },
            }),
          ),
      );

    await setup({
      mode: 'create',
      lookups: { courses: [], professors: [], rooms: [] },
    });

    const fixture = TestBed.createComponent(ClassFormDialog);
    fixture.detectChanges();

    fixture.componentInstance.form.patchValue({
      code: 'SE-A',
      courseId: 'crs-1',
      professorId: 'prof-1',
      roomId: 'rm-1',
      year: 2026,
      semester: 2,
      startDate: '2026-08-01',
      endDate: '2026-12-10',
      seats: 40,
    });
    fixture.componentInstance.onSubmit();
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    expect(closedWith).toBeUndefined();
    expect(el.querySelector('[role="alert"]')?.textContent).toContain(
      'FR-13: Conflito de sala padrão no período informado.',
    );
    expect(fixture.componentInstance.form.controls.code.value).toBe('SE-A');
  });

  it('disables immutable fields (courseId, year, semester, startDate, endDate) in edit mode', async () => {
    createCall = () => of(CREATED_CLASS);
    await setup({
      mode: 'edit',
      classItem: CREATED_CLASS,
      lookups: { courses: [], professors: [], rooms: [] },
    });

    const fixture = TestBed.createComponent(ClassFormDialog);
    fixture.detectChanges();

    const controls = fixture.componentInstance.form.controls;
    expect(controls.courseId.disabled).toBe(true);
    expect(controls.year.disabled).toBe(true);
    expect(controls.semester.disabled).toBe(true);
    expect(controls.startDate.disabled).toBe(true);
    expect(controls.endDate.disabled).toBe(true);
    expect(controls.seats.disabled).toBe(false);
  });

  it('always uses mat-select for Disciplina, Professor, and Sala padrão without generating fake UUIDs when catalogs are unavailable', async () => {
    createCall = () => of(CREATED_CLASS);

    await setup({
      mode: 'create',
      lookups: {
        courses: [],
        professors: [],
        rooms: [],
        unavailable: ['courses', 'professors', 'rooms'],
      },
    });

    const fixture = TestBed.createComponent(ClassFormDialog);
    fixture.detectChanges();

    const cmp = fixture.componentInstance;
    const el = fixture.nativeElement as HTMLElement;

    expect(cmp.form.controls.courseId.value).toBe('');
    expect(cmp.form.controls.professorId.value).toBe('');
    expect(cmp.form.controls.roomId.value).toBe('');
    expect(el.querySelectorAll('mat-select').length).toBeGreaterThanOrEqual(5);
    expect(el.querySelector('[role="alert"]')?.textContent).toContain(
      'Serviço de composição indisponível.',
    );
    expect(el.textContent).toContain(
      'Catálogos indisponíveis no BFF no momento: Disciplinas, Professores, Salas.',
    );
  });
});
