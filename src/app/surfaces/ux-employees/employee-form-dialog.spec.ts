import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import {
  MAT_DIALOG_DATA,
  MatDialogRef,
} from '@angular/material/dialog';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { provideRouter, Router } from '@angular/router';
import { environment } from '../../../environments/environment';
import { AuthSession } from '../../shell/auth-session';
import {
  EmployeeFormDialog,
  type EmployeeFormDialogData,
  type EmployeeFormDialogResult,
} from './employee-form-dialog';
import type { EmployeeRead } from './employees-api';

const EMPLOYEE: EmployeeRead = {
  id: 'emp-1',
  enabled: true,
  registrationNumber: '100',
  name: 'Helena Costa',
  salary: 8500.5,
  hireDate: '2020-01-15',
  position: 'Analista',
  status: 'Active',
  dependents: [],
  email: 'helena.costa@pucrs.br',
  phone: '51999990000',
};

describe('EmployeeFormDialog', () => {
  let http: HttpTestingController;
  let router: Router;
  let closeSpy: ReturnType<typeof vi.fn>;
  let dialogRef: {
    close: ReturnType<typeof vi.fn>;
    disableClose: boolean;
  };

  beforeEach(async () => {
    closeSpy = vi.fn();
    dialogRef = { close: closeSpy, disableClose: false };

    await TestBed.configureTestingModule({
      imports: [EmployeeFormDialog],
      providers: [
        provideAnimationsAsync(),
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        {
          provide: MAT_DIALOG_DATA,
          useValue: { mode: 'create' } satisfies EmployeeFormDialogData,
        },
        { provide: MatDialogRef, useValue: dialogRef },
      ],
    }).compileComponents();

    http = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);
  });

  afterEach(() => {
    http.verify();
  });

  function createDialog(data: EmployeeFormDialogData = { mode: 'create' }) {
    TestBed.resetTestingModule();
    closeSpy = vi.fn();
    dialogRef = { close: closeSpy, disableClose: false };

    TestBed.configureTestingModule({
      imports: [EmployeeFormDialog],
      providers: [
        provideAnimationsAsync(),
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: MAT_DIALOG_DATA, useValue: data },
        { provide: MatDialogRef, useValue: dialogRef },
      ],
    });

    http = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);

    const fixture = TestBed.createComponent(EmployeeFormDialog);
    fixture.detectChanges();
    return fixture;
  }

  function fillValidCreate(fixture: ReturnType<typeof createDialog>): void {
    const dialog = fixture.componentInstance;
    dialog.form.setValue({
      registrationNumber: '100',
      name: 'Helena Costa',
      salary: 8500.5,
      hireDate: '2020-01-15',
      position: 'Analista',
      status: 'Active',
      phone: '51999990000',
      email: 'helena.costa@pucrs.br',
    });
  }

  it('create happy path POSTs and closes with id', () => {
    const fixture = createDialog({ mode: 'create' });
    fillValidCreate(fixture);

    fixture.componentInstance.save();

    const req = http.expectOne(`${environment.bffBaseUrl}/v1/employees`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({
      registrationNumber: '100',
      name: 'Helena Costa',
      salary: 8500.5,
      hireDate: '2020-01-15',
      position: 'Analista',
      status: 'Active',
      phone: '51999990000',
      email: 'helena.costa@pucrs.br',
    });
    req.flush({ ...EMPLOYEE, id: 'emp-new', dependents: undefined });

    expect(closeSpy).toHaveBeenCalledWith({ id: 'emp-new' } satisfies EmployeeFormDialogResult);
    expect(fixture.componentInstance.saving()).toBe(false);
  });

  it('email conflict shows refusal banner and keeps dialog open', () => {
    const fixture = createDialog({ mode: 'create' });
    fillValidCreate(fixture);

    fixture.componentInstance.save();

    const req = http.expectOne(`${environment.bffBaseUrl}/v1/employees`);
    req.flush(
      {
        type: 'about:blank',
        title: 'Conflict',
        detail: 'E-mail já cadastrado para outro funcionário.',
        status: 409,
      },
      { status: 409, statusText: 'Conflict' },
    );
    fixture.detectChanges();

    expect(closeSpy).not.toHaveBeenCalled();
    expect(fixture.componentInstance.bannerKind()).toBe('refusal');
    expect(fixture.componentInstance.bannerMessage()).toBe(
      'E-mail já cadastrado para outro funcionário.',
    );
    expect(fixture.componentInstance.form.controls.name.value).toBe(
      'Helena Costa',
    );
    expect(fixture.componentInstance.form.controls.email.value).toBe(
      'helena.costa@pucrs.br',
    );
  });

  it('refusal with detail+code includes code and retains form', () => {
    const fixture = createDialog({ mode: 'create' });
    fillValidCreate(fixture);
    fixture.componentInstance.save();

    const req = http.expectOne(`${environment.bffBaseUrl}/v1/employees`);
    req.flush(
      {
        type: 'about:blank',
        title: 'Conflict',
        detail: 'E-mail já cadastrado para outro funcionário.',
        code: 'conflict',
        status: 409,
      },
      { status: 409, statusText: 'Conflict' },
    );
    fixture.detectChanges();

    expect(closeSpy).not.toHaveBeenCalled();
    expect(fixture.componentInstance.bannerKind()).toBe('refusal');
    expect(fixture.componentInstance.bannerMessage()).toContain(
      'E-mail já cadastrado para outro funcionário.',
    );
    expect(fixture.componentInstance.bannerMessage()).toContain('conflito');
    expect(fixture.componentInstance.form.controls.name.value).toBe(
      'Helena Costa',
    );
    expect(fixture.componentInstance.form.controls.email.value).toBe(
      'helena.costa@pucrs.br',
    );
    const alert = (fixture.nativeElement as HTMLElement).querySelector(
      '[role="alert"]',
    );
    expect(alert?.textContent).toContain('conflito');
  });

  it('email conflict 400 with title falls back when detail absent', () => {
    const fixture = createDialog({ mode: 'create' });
    fillValidCreate(fixture);
    fixture.componentInstance.save();

    const req = http.expectOne(`${environment.bffBaseUrl}/v1/employees`);
    req.flush(
      { title: 'E-mail duplicado' },
      { status: 400, statusText: 'Bad Request' },
    );
    fixture.detectChanges();

    expect(closeSpy).not.toHaveBeenCalled();
    expect(fixture.componentInstance.bannerKind()).toBe('refusal');
    expect(fixture.componentInstance.bannerMessage()).toBe('E-mail duplicado');
  });

  it('401 clears session, closes dialog and navigates to login', () => {
    const fixture = createDialog({ mode: 'create' });
    const session = TestBed.inject(AuthSession);
    const clearSpy = vi.spyOn(session, 'clear');
    const navigateSpy = vi.spyOn(router, 'navigateByUrl').mockResolvedValue(true);

    fillValidCreate(fixture);
    fixture.componentInstance.save();

    const req = http.expectOne(`${environment.bffBaseUrl}/v1/employees`);
    req.flush(
      { message: 'unauthorized' },
      { status: 401, statusText: 'Unauthorized' },
    );

    expect(clearSpy).toHaveBeenCalled();
    expect(closeSpy).toHaveBeenCalledWith(false);
    expect(navigateSpy).toHaveBeenCalledWith('/login');
  });

  it('edit mode PUTs and closes with employee id', () => {
    const fixture = createDialog({ mode: 'edit', employee: EMPLOYEE });
    fixture.componentInstance.form.patchValue({
      position: 'Analista Sênior',
      status: 'Inactive',
    });
    fixture.componentInstance.save();

    const req = http.expectOne(
      `${environment.bffBaseUrl}/v1/employees/emp-1`,
    );
    expect(req.request.method).toBe('PUT');
    expect(req.request.body.position).toBe('Analista Sênior');
    expect(req.request.body.status).toBe('Inactive');
    expect(req.request.body.phone).toBe('51999990000');
    expect(req.request.body.email).toBe('helena.costa@pucrs.br');
    req.flush({ ...EMPLOYEE, position: 'Analista Sênior', status: 'Inactive' });

    expect(closeSpy).toHaveBeenCalledWith({ id: 'emp-1' });
  });

  it('shows composition banner on 503 and keeps dialog open', () => {
    const fixture = createDialog({ mode: 'create' });
    fillValidCreate(fixture);
    fixture.componentInstance.save();

    const req = http.expectOne(`${environment.bffBaseUrl}/v1/employees`);
    req.flush(
      { message: 'down' },
      { status: 503, statusText: 'Service Unavailable' },
    );
    fixture.detectChanges();

    expect(closeSpy).not.toHaveBeenCalled();
    expect(fixture.componentInstance.bannerKind()).toBe('composition');
    expect(fixture.componentInstance.bannerMessage()).toContain(
      'composição indisponível',
    );
  });

  it('refuses to close create when response has blank id', () => {
    const fixture = createDialog({ mode: 'create' });
    fillValidCreate(fixture);
    fixture.componentInstance.save();

    const req = http.expectOne(`${environment.bffBaseUrl}/v1/employees`);
    req.flush({ ...EMPLOYEE, id: '   ', dependents: [] });
    fixture.detectChanges();

    expect(closeSpy).not.toHaveBeenCalled();
    expect(fixture.componentInstance.bannerKind()).toBe('refusal');
  });

  it('create omits empty phone and email from body', () => {
    const fixture = createDialog({ mode: 'create' });
    fixture.componentInstance.form.setValue({
      registrationNumber: '100',
      name: 'Helena Costa',
      salary: 8500.5,
      hireDate: '2020-01-15',
      position: 'Analista',
      status: 'Active',
      phone: '  ',
      email: '',
    });
    fixture.componentInstance.save();

    const req = http.expectOne(`${environment.bffBaseUrl}/v1/employees`);
    expect(req.request.body).toEqual({
      registrationNumber: '100',
      name: 'Helena Costa',
      salary: 8500.5,
      hireDate: '2020-01-15',
      position: 'Analista',
      status: 'Active',
    });
    expect(req.request.body.phone).toBeUndefined();
    expect(req.request.body.email).toBeUndefined();
    req.flush({ ...EMPLOYEE, dependents: [] });
  });
});
