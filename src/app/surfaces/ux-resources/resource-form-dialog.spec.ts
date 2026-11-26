import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { provideRouter, Router } from '@angular/router';
import { environment } from '../../../environments/environment';
import { AuthSession } from '../../shell/auth-session';
import {
  ResourceFormDialog,
  parseTags,
  type ResourceFormDialogData,
} from './resource-form-dialog';

const LIST_URL = `${environment.bffBaseUrl}/v1/resources`;

const RESOURCE = {
  id: 'res-1',
  code: 'PROJ-01',
  name: 'Projetor 4K',
  type: 'PROJECTOR' as const,
  active: true,
  tags: ['av'],
};

describe('ResourceFormDialog', () => {
  let http: HttpTestingController;
  let dialogRef: { close: ReturnType<typeof vi.fn>; disableClose: boolean };

  async function setup(data: ResourceFormDialogData) {
    dialogRef = { close: vi.fn(), disableClose: false };
    await TestBed.configureTestingModule({
      imports: [ResourceFormDialog],
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
    const fixture = TestBed.createComponent(ResourceFormDialog);
    fixture.detectChanges();
    return fixture;
  }

  afterEach(() => {
    http.verify();
  });

  describe('create', () => {
    it('POSTs an uppercased code, the type, active flag and parsed tags', async () => {
      const fixture = await setup({ mode: 'create' });
      const dialog = fixture.componentInstance;
      expect(dialog.dialogTitle).toBe('Novo recurso');

      dialog.form.setValue({
        code: ' proj-02 ',
        name: '  Projetor sala 3 ',
        type: 'PROJECTOR',
        active: false,
        tags: 'AV, multimidia, av',
      });
      dialog.save();

      const req = http.expectOne(LIST_URL);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({
        code: 'PROJ-02',
        name: 'Projetor sala 3',
        type: 'PROJECTOR',
        active: false,
        tags: ['av', 'multimidia'],
      });
      expect(dialog.saving()).toBe(true);
      expect(dialogRef.disableClose).toBe(true);

      req.flush({ ...RESOURCE, id: 'res-new' }, { status: 201, statusText: 'Created' });
      expect(dialogRef.close).toHaveBeenCalledWith({ id: 'res-new' });
    });

    it('blocks invalid input without calling the BFF', async () => {
      const fixture = await setup({ mode: 'create' });
      const dialog = fixture.componentInstance;

      dialog.form.setValue({
        code: 'a b',
        name: '   ',
        type: null,
        active: true,
        tags: 'Com Espaço',
      });
      dialog.save();
      fixture.detectChanges();

      http.expectNone(LIST_URL);
      expect(dialog.form.controls.code.hasError('pattern')).toBe(true);
      expect(dialog.form.controls.name.hasError('required')).toBe(true);
      expect(dialog.form.controls.type.hasError('required')).toBe(true);
      expect(dialog.form.controls.tags.hasError('pattern')).toBe(true);
      expect(dialogRef.close).not.toHaveBeenCalled();
    });

    it('keeps the form and shows a pt-BR refusal on duplicate code (409)', async () => {
      const fixture = await setup({ mode: 'create' });
      const dialog = fixture.componentInstance;
      dialog.form.setValue({
        code: 'PROJ-01',
        name: 'Outro projetor',
        type: 'PROJECTOR',
        active: true,
        tags: '',
      });
      dialog.save();

      http
        .expectOne(LIST_URL)
        .flush({ title: 'Conflict' }, { status: 409, statusText: 'Conflict' });
      fixture.detectChanges();

      const el = fixture.nativeElement as HTMLElement;
      expect(el.querySelector('[role="alert"]')?.textContent).toContain(
        'Já existe um recurso com este código.',
      );
      expect(dialog.form.controls.name.value).toBe('Outro projetor');
      expect(dialog.saving()).toBe(false);
      expect(dialogRef.disableClose).toBe(false);
      expect(dialogRef.close).not.toHaveBeenCalled();
    });

    it('shows the service problem detail on 422', async () => {
      const fixture = await setup({ mode: 'create' });
      const dialog = fixture.componentInstance;
      dialog.form.setValue({
        code: 'PROJ-09',
        name: 'Projetor',
        type: 'PROJECTOR',
        active: true,
        tags: '',
      });
      dialog.save();

      http.expectOne(LIST_URL).flush(
        { title: 'Unprocessable', detail: 'name must not be blank' },
        { status: 422, statusText: 'Unprocessable Entity' },
      );
      fixture.detectChanges();

      expect(
        (fixture.nativeElement as HTMLElement).querySelector('[role="alert"]')
          ?.textContent,
      ).toContain('name must not be blank');
      expect(dialogRef.close).not.toHaveBeenCalled();
    });
  });

  describe('edit', () => {
    it('locks the code field and prefills the resource', async () => {
      const fixture = await setup({ mode: 'edit', resource: RESOURCE });
      const dialog = fixture.componentInstance;

      expect(dialog.dialogTitle).toBe('Editar recurso');
      expect(dialog.form.controls.code.disabled).toBe(true);
      expect(dialog.form.getRawValue()).toEqual({
        code: 'PROJ-01',
        name: 'Projetor 4K',
        type: 'PROJECTOR',
        active: true,
        tags: 'av',
      });
    });

    it('PATCHes only the fields that changed', async () => {
      const fixture = await setup({ mode: 'edit', resource: RESOURCE });
      const dialog = fixture.componentInstance;

      dialog.form.controls.active.setValue(false);
      dialog.form.controls.tags.setValue('av, sala-3');
      dialog.save();

      const req = http.expectOne(`${LIST_URL}/res-1`);
      expect(req.request.method).toBe('PATCH');
      expect(req.request.body).toEqual({ active: false, tags: ['av', 'sala-3'] });

      req.flush({ ...RESOURCE, active: false, tags: ['av', 'sala-3'] });
      expect(dialogRef.close).toHaveBeenCalledWith({ id: 'res-1' });
    });

    it('closes without a request when nothing changed', async () => {
      const fixture = await setup({ mode: 'edit', resource: RESOURCE });
      fixture.componentInstance.save();

      http.expectNone(`${LIST_URL}/res-1`);
      expect(dialogRef.close).toHaveBeenCalledWith({ id: 'res-1' });
    });

    it('shows a permission refusal on 403', async () => {
      const fixture = await setup({ mode: 'edit', resource: RESOURCE });
      const dialog = fixture.componentInstance;
      dialog.form.controls.name.setValue('Projetor renomeado');
      dialog.save();

      http
        .expectOne(`${LIST_URL}/res-1`)
        .flush({}, { status: 403, statusText: 'Forbidden' });
      fixture.detectChanges();

      expect(
        (fixture.nativeElement as HTMLElement).querySelector('[role="alert"]')
          ?.textContent,
      ).toContain('Você não tem permissão para alterar recursos.');
    });
  });

  it('clears the session and goes to /login on 401', async () => {
    const fixture = await setup({ mode: 'edit', resource: RESOURCE });
    const clearSpy = vi.spyOn(TestBed.inject(AuthSession), 'clear');
    const navigateSpy = vi
      .spyOn(TestBed.inject(Router), 'navigateByUrl')
      .mockResolvedValue(true);
    const dialog = fixture.componentInstance;
    dialog.form.controls.name.setValue('Outro nome');
    dialog.save();

    http
      .expectOne(`${LIST_URL}/res-1`)
      .flush({}, { status: 401, statusText: 'Unauthorized' });

    expect(clearSpy).toHaveBeenCalled();
    expect(dialogRef.close).toHaveBeenCalledWith(false);
    expect(navigateSpy).toHaveBeenCalledWith('/login');
  });

  it('parseTags lowercases, trims and dedupes', () => {
    expect(parseTags(' AV ,, sala-3, av ')).toEqual(['av', 'sala-3']);
    expect(parseTags('')).toEqual([]);
  });
});
