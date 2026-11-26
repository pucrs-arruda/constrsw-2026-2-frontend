import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { provideRouter } from '@angular/router';
import { environment } from '../../../environments/environment';
import {
  OccurrenceFormDialog,
  type OccurrenceFormDialogData,
} from './occurrence-form-dialog';
import type { Occurrence } from './resources-api';

const BASE = `${environment.bffBaseUrl}/v1/resources/res-1/occurrences`;

const OPEN: Occurrence = {
  id: 'occ-1',
  resourceId: 'res-1',
  description: 'Lâmpada fraca',
  type: 'MALFUNCTION',
  priority: 'HIGH',
  status: 'OPEN',
  resolution: null,
  reportedBy: 'user-1',
  resolvedBy: null,
  createdAt: '2026-11-20T13:00:00Z',
  resolvedAt: null,
  updatedAt: '2026-11-20T13:00:00Z',
};

describe('OccurrenceFormDialog', () => {
  let http: HttpTestingController;
  let dialogRef: { close: ReturnType<typeof vi.fn>; disableClose: boolean };

  async function setup(data: OccurrenceFormDialogData) {
    dialogRef = { close: vi.fn(), disableClose: false };
    await TestBed.configureTestingModule({
      imports: [OccurrenceFormDialog],
      providers: [
        provideAnimationsAsync(),
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: MAT_DIALOG_DATA, useValue: data },
        { provide: MatDialogRef, useValue: dialogRef },
      ],
    }).compileComponents();
    http = TestBed.inject(HttpTestingController);
    const fixture = TestBed.createComponent(OccurrenceFormDialog);
    fixture.detectChanges();
    return fixture;
  }

  afterEach(() => {
    http.verify();
  });

  describe('register', () => {
    const data: OccurrenceFormDialogData = {
      mode: 'register',
      resourceId: 'res-1',
      resourceName: 'Projetor 4K',
    };

    it('POSTs description, type and priority (default Média)', async () => {
      const fixture = await setup(data);
      const dialog = fixture.componentInstance;
      expect(dialog.dialogTitle).toBe('Registrar ocorrência');
      expect(dialog.registerForm.controls.priority.value).toBe('MEDIUM');
      expect(fixture.nativeElement.textContent).toContain('Recurso: Projetor 4K');

      dialog.registerForm.setValue({
        description: '  Lâmpada fraca ',
        type: 'MALFUNCTION',
        priority: 'MEDIUM',
      });
      dialog.save();

      const req = http.expectOne(BASE);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({
        description: 'Lâmpada fraca',
        type: 'MALFUNCTION',
        priority: 'MEDIUM',
      });
      req.flush(OPEN, { status: 201, statusText: 'Created' });
      expect(dialogRef.close).toHaveBeenCalledWith({ id: 'occ-1' });
    });

    it('requires description and type', async () => {
      const fixture = await setup(data);
      fixture.componentInstance.save();

      http.expectNone(BASE);
      const form = fixture.componentInstance.registerForm;
      expect(form.controls.description.hasError('required')).toBe(true);
      expect(form.controls.type.hasError('required')).toBe(true);
    });

    it('keeps the form and shows a permission refusal on 403', async () => {
      const fixture = await setup(data);
      const dialog = fixture.componentInstance;
      dialog.registerForm.setValue({
        description: 'Cabo solto',
        type: 'DAMAGE',
        priority: 'LOW',
      });
      dialog.save();

      http.expectOne(BASE).flush({}, { status: 403, statusText: 'Forbidden' });
      fixture.detectChanges();

      expect(
        (fixture.nativeElement as HTMLElement).querySelector('[role="alert"]')
          ?.textContent,
      ).toContain('Você não tem permissão para alterar ocorrências.');
      expect(dialog.registerForm.controls.description.value).toBe('Cabo solto');
      expect(dialogRef.close).not.toHaveBeenCalled();
    });
  });

  describe('resolve', () => {
    const data: OccurrenceFormDialogData = {
      mode: 'resolve',
      resourceId: 'res-1',
      occurrence: OPEN,
    };

    it('shows the occurrence and PATCHes the resolution', async () => {
      const fixture = await setup(data);
      const dialog = fixture.componentInstance;
      expect(dialog.dialogTitle).toBe('Resolver ocorrência');
      const content = fixture.nativeElement.textContent as string;
      expect(content).toContain('Lâmpada fraca');
      expect(content).toContain('Defeito · Alta');

      dialog.resolveForm.setValue({ resolution: ' Lâmpada substituída ' });
      dialog.save();

      const req = http.expectOne(`${BASE}/occ-1`);
      expect(req.request.method).toBe('PATCH');
      expect(req.request.body).toEqual({ resolution: 'Lâmpada substituída' });
      req.flush({ ...OPEN, status: 'RESOLVED', resolution: 'Lâmpada substituída' });
      expect(dialogRef.close).toHaveBeenCalledWith({ id: 'occ-1' });
    });

    it('requires a resolution', async () => {
      const fixture = await setup(data);
      fixture.componentInstance.resolveForm.setValue({ resolution: '   ' });
      fixture.componentInstance.save();

      http.expectNone(`${BASE}/occ-1`);
      expect(dialogRef.close).not.toHaveBeenCalled();
    });

    it('explains a 409 as already resolved', async () => {
      const fixture = await setup(data);
      fixture.componentInstance.resolveForm.setValue({ resolution: 'Feito' });
      fixture.componentInstance.save();

      http
        .expectOne(`${BASE}/occ-1`)
        .flush({}, { status: 409, statusText: 'Conflict' });
      fixture.detectChanges();

      expect(
        (fixture.nativeElement as HTMLElement).querySelector('[role="alert"]')
          ?.textContent,
      ).toContain('Esta ocorrência já foi resolvida.');
    });
  });
});
