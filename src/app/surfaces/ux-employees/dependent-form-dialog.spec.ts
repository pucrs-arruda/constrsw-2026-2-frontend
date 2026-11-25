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
import { provideRouter } from '@angular/router';
import { environment } from '../../../environments/environment';
import {
  DependentFormDialog,
  type DependentFormDialogData,
} from './dependent-form-dialog';

describe('DependentFormDialog', () => {
  let http: HttpTestingController;
  let closeSpy: ReturnType<typeof vi.fn>;
  let dialogRef: {
    close: ReturnType<typeof vi.fn>;
    disableClose: boolean;
  };

  beforeEach(async () => {
    closeSpy = vi.fn();
    dialogRef = { close: closeSpy, disableClose: false };

    await TestBed.configureTestingModule({
      imports: [DependentFormDialog],
      providers: [
        provideAnimationsAsync(),
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        {
          provide: MAT_DIALOG_DATA,
          useValue: {
            mode: 'create',
            employeeId: 'emp-1',
          } satisfies DependentFormDialogData,
        },
        { provide: MatDialogRef, useValue: dialogRef },
      ],
    }).compileComponents();

    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify();
  });

  function createDialog(
    data: DependentFormDialogData = {
      mode: 'create',
      employeeId: 'emp-1',
    },
  ) {
    TestBed.resetTestingModule();
    closeSpy = vi.fn();
    dialogRef = { close: closeSpy, disableClose: false };

    TestBed.configureTestingModule({
      imports: [DependentFormDialog],
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

    const fixture = TestBed.createComponent(DependentFormDialog);
    fixture.detectChanges();
    return fixture;
  }

  it('refusal with detail+code includes code and retains form', () => {
    const fixture = createDialog();
    const dialog = fixture.componentInstance;
    dialog.form.setValue({
      name: 'Caio Costa',
      birthDate: '2010-05-01',
      dependencyType: 'filho',
      status: 'Active',
    });
    dialog.save();

    const req = http.expectOne(
      `${environment.bffBaseUrl}/v1/employees/emp-1/dependents`,
    );
    req.flush(
      {
        type: 'about:blank',
        title: 'Conflict',
        detail: 'Dependente já vinculado.',
        code: 'conflict',
        status: 409,
      },
      { status: 409, statusText: 'Conflict' },
    );
    fixture.detectChanges();

    expect(closeSpy).not.toHaveBeenCalled();
    expect(dialog.bannerKind()).toBe('refusal');
    expect(dialog.bannerMessage()).toContain('Dependente já vinculado.');
    expect(dialog.bannerMessage()).toContain('conflito');
    expect(dialog.form.controls.name.value).toBe('Caio Costa');
    expect(dialog.form.controls.dependencyType.value).toBe('filho');

    const alert = (fixture.nativeElement as HTMLElement).querySelector(
      '[role="alert"]',
    );
    expect(alert?.textContent).toContain('conflito');
  });

  it('shows composition banner on write 503 and keeps dialog open', () => {
    const fixture = createDialog();
    const dialog = fixture.componentInstance;
    dialog.form.setValue({
      name: 'Caio Costa',
      birthDate: '2010-05-01',
      dependencyType: 'filho',
      status: 'Active',
    });
    dialog.save();

    const req = http.expectOne(
      `${environment.bffBaseUrl}/v1/employees/emp-1/dependents`,
    );
    req.flush(
      { message: 'down' },
      { status: 503, statusText: 'Service Unavailable' },
    );
    fixture.detectChanges();

    expect(closeSpy).not.toHaveBeenCalled();
    expect(dialog.bannerKind()).toBe('composition');
    expect(dialog.bannerMessage()).toContain('composição indisponível');
  });
});
