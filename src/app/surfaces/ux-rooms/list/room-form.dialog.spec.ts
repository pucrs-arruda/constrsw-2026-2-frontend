import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialog, MatDialogRef } from '@angular/material/dialog';
import { EMPTY, of, throwError } from 'rxjs';
import { RoomsApiService } from '../data/rooms-api.service';
import { Room } from '../data/rooms.models';
import { RoomFormDialog } from './room-form.dialog';

const room: Room = {
  id: '1', code: 'A-101', name: 'Sala de aula', building: 'Prédio A',
  capacity: 30, active: true, enabled: true, resourceIds: [],
};

describe('RoomFormDialog', () => {
  let fixture: ComponentFixture<RoomFormDialog>;
  const patch = vi.fn();
  const close = vi.fn();
  const open = vi.fn();

  beforeEach(() => {
    vi.resetAllMocks();
    TestBed.configureTestingModule({
      providers: [
        { provide: MAT_DIALOG_DATA, useValue: { mode: 'edit', room } },
        { provide: MatDialogRef, useValue: {
          close, updateSize: vi.fn(), keydownEvents: () => EMPTY, backdropClick: () => EMPTY,
        } },
        { provide: MatDialog, useValue: { open } },
        { provide: RoomsApiService, useValue: { patch } },
      ],
    });
    // O componente importa MatDialogModule, que provê MatDialog no injector do próprio
    // componente e encobre o provider raiz do TestBed. O dublê precisa entrar no mesmo nível.
    TestBed.overrideComponent(RoomFormDialog, {
      add: { providers: [{ provide: MatDialog, useValue: { open } }] },
    });
    fixture = TestBed.createComponent(RoomFormDialog);
    fixture.detectChanges();
  });

  it('envia somente os campos alterados', () => {
    patch.mockReturnValue(of({ ...room, capacity: 40 }));
    fixture.componentInstance.form.controls.capacity.setValue(40);
    fixture.componentInstance.save();
    expect(patch).toHaveBeenCalledWith('1', { capacity: 40 });
    expect(close).toHaveBeenCalledWith({ ...room, capacity: 40 });
  });

  it('bloqueia o envio de capacidade inválida', () => {
    fixture.componentInstance.form.controls.capacity.setValue(0);
    fixture.componentInstance.save();
    expect(fixture.componentInstance.form.controls.capacity.hasError('capacity')).toBe(true);
    expect(patch).not.toHaveBeenCalled();
  });

  it('aceita apagar a capacidade (opcional na API) e envia null', () => {
    patch.mockReturnValue(of({ ...room, capacity: null }));
    fixture.componentInstance.form.controls.capacity.setValue(null);
    expect(fixture.componentInstance.form.controls.capacity.valid).toBe(true);
    fixture.componentInstance.save();
    expect(patch).toHaveBeenCalledWith('1', { capacity: null });
  });

  it('mantém os campos preenchidos e exibe a mensagem de conflito', () => {
    patch.mockReturnValue(throwError(() => ({
      kind: 'conflict', status: 409, code: 'RM-409', message: 'Já existe uma sala com este código.',
    })));
    fixture.componentInstance.form.controls.code.setValue('A-102');
    fixture.componentInstance.save();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('app-alert-banner').textContent).toContain('Já existe uma sala com este código.');
    expect(fixture.componentInstance.form.controls.code.value).toBe('A-102');
    expect(close).not.toHaveBeenCalled();
  });

  it('mantém o formulário aberto quando o descarte não é confirmado', () => {
    open.mockReturnValue({ afterClosed: () => of(false) });
    fixture.componentInstance.form.controls.name.setValue('Outro nome');
    fixture.componentInstance.cancel();
    expect(open).toHaveBeenCalled();
    expect(close).not.toHaveBeenCalled();
  });
});
