import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialog, MatDialogRef } from '@angular/material/dialog';
import { EMPTY, of, Subject } from 'rxjs';
import { RoomsApiService } from '../data/rooms-api.service';
import { FeatureFormData, FeatureFormDialog } from './feature-form.dialog';

describe('FeatureFormDialog', () => {
  const feature = {
    id: 'ramp',
    roomId: 'room',
    code: 'RAMP',
    description: 'Rampa lateral',
    present: true,
    enabled: true,
  };
  const api = { createFeature: vi.fn(), patchFeature: vi.fn() };
  const escape = new Subject<KeyboardEvent>();
  const dialogRef = { close: vi.fn(), keydownEvents: () => escape, backdropClick: () => EMPTY };
  const dialogs = { open: vi.fn() };
  let fixture: ComponentFixture<FeatureFormDialog>;
  let host: HTMLElement;

  async function open(data: FeatureFormData): Promise<void> {
    vi.resetAllMocks();
    api.createFeature.mockReturnValue(of(feature));
    api.patchFeature.mockReturnValue(of({ ...feature, description: null }));
    await TestBed.configureTestingModule({
      imports: [FeatureFormDialog],
      providers: [
        { provide: MAT_DIALOG_DATA, useValue: data },
        { provide: MatDialogRef, useValue: dialogRef },

        { provide: RoomsApiService, useValue: api },
      ],
    })
      .overrideProvider(MatDialog, { useValue: dialogs })
      .compileComponents();
    fixture = TestBed.createComponent(FeatureFormDialog);
    host = fixture.nativeElement;
    fixture.detectChanges();
  }

  function enter(selector: string, value: string): void {
    const input = host.querySelector<HTMLInputElement>(selector)!;
    input.value = value;
    input.dispatchEvent(new Event('input', { bubbles: true }));
    fixture.detectChanges();
  }

  function save(): void {
    host.querySelector<HTMLButtonElement>('button[type="submit"]')!.click();
  }

  it('normaliza o código e cria com presença ligada por padrão', async () => {
    await open({ roomId: 'room' });
    enter('input', 'tactile floor');
    save();
    expect(api.createFeature).toHaveBeenCalledWith('room', {
      code: 'TACTILE_FLOOR',
      present: true,
    });
  });

  it('bloqueia código fora do padrão', async () => {
    await open({ roomId: 'room' });
    enter('input', '1-ramp');
    save();
    expect(api.createFeature).not.toHaveBeenCalled();
  });

  it('envia só a descrição alterada e usa null quando apagada', async () => {
    await open({ roomId: 'room', feature });
    enter('textarea', '');
    save();
    expect(api.patchFeature).toHaveBeenCalledWith('room', 'ramp', { description: null });
  });

  it('pede confirmação ao pressionar Esc com alterações', async () => {
    await open({ roomId: 'room', feature });
    enter('textarea', '');
    dialogs.open.mockReturnValue({ afterClosed: () => of(false) });
    escape.next(new KeyboardEvent('keydown', { key: 'Escape', cancelable: true }));
    expect(dialogs.open).toHaveBeenCalled();
    expect(dialogRef.close).not.toHaveBeenCalled();
  });
});
