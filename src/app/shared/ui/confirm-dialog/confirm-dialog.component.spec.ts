import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { ConfirmDialogComponent, ConfirmDialogData } from './confirm-dialog.component';

describe('ConfirmDialogComponent', () => {
  let component: ConfirmDialogComponent;
  let fixture: ComponentFixture<ConfirmDialogComponent>;
  let mockDialogRef: { close: ReturnType<typeof vi.fn> };

  const testData: ConfirmDialogData = {
    title: 'Excluir sala B201?',
    message: 'Esta ação não pode ser desfeita.',
    confirmLabel: 'Excluir',
    cancelLabel: 'Voltar',
    destructive: true,
  };

  beforeEach(async () => {
    mockDialogRef = { close: vi.fn() };

    await TestBed.configureTestingModule({
      imports: [ConfirmDialogComponent],
      providers: [
        { provide: MAT_DIALOG_DATA, useValue: testData },
        { provide: MatDialogRef, useValue: mockDialogRef },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ConfirmDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('deve criar o ConfirmDialogComponent', () => {
    expect(component).toBeTruthy();
  });

  it('deve exibir o título e a mensagem configurados', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.dialog-title')?.textContent).toContain('Excluir sala B201?');
    expect(compiled.querySelector('.dialog-content')?.textContent).toContain(
      'Esta ação não pode ser desfeita.',
    );
  });

  it('deve fechar com false ao cancelar', () => {
    component.onCancel();
    expect(mockDialogRef.close).toHaveBeenCalledWith(false);
  });

  it('deve fechar com true ao confirmar', () => {
    component.onConfirm();
    expect(mockDialogRef.close).toHaveBeenCalledWith(true);
  });
});
