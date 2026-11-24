import { TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { ConfirmDialogComponent, ConfirmDialogData } from './confirm-dialog.component';

describe('ConfirmDialogComponent', () => {
  let dialogRefSpy: { close: ReturnType<typeof vi.fn> };

  const mockData: ConfirmDialogData = {
    title: 'Excluir sala B201?',
    message: 'Esta ação não pode ser desfeita.',
    confirmLabel: 'Excluir',
    destructive: true,
  };

  beforeEach(async () => {
    dialogRefSpy = { close: vi.fn() };

    await TestBed.configureTestingModule({
      imports: [ConfirmDialogComponent],
      providers: [
        { provide: MAT_DIALOG_DATA, useValue: mockData },
        { provide: MatDialogRef, useValue: dialogRefSpy },
      ],
    }).compileComponents();
  });

  it('deve renderizar o título e a mensagem de confirmação', () => {
    const fixture = TestBed.createComponent(ConfirmDialogComponent);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('#confirm-dialog-title')?.textContent).toContain('Excluir sala B201?');
    expect(el.querySelector('.dialog-message')?.textContent).toContain('Esta ação não pode ser desfeita.');
  });

  it('deve fechar com true ao clicar em confirmar', () => {
    const fixture = TestBed.createComponent(ConfirmDialogComponent);
    fixture.detectChanges();
    fixture.componentInstance.onConfirm();
    expect(dialogRefSpy.close).toHaveBeenCalledWith(true);
  });

  it('deve fechar com false ao clicar em cancelar', () => {
    const fixture = TestBed.createComponent(ConfirmDialogComponent);
    fixture.detectChanges();
    fixture.componentInstance.onCancel();
    expect(dialogRefSpy.close).toHaveBeenCalledWith(false);
  });
});
