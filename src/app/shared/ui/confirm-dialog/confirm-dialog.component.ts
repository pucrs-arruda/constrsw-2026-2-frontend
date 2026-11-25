import { Component, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';

export interface ConfirmDialogData {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
}

/**
 * Confirmação de ação irreversível ou destrutiva. O EXPERIENCE.md permite **um** diálogo de cada
 * vez, então esta é a única confirmação da superfície.
 *
 * `destructive` tinge o botão de confirmação com a cor de erro do tema: excluir uma sala não pode
 * parecer igual a salvar um formulário.
 */
@Component({
  selector: 'app-confirm-dialog',
  standalone: true,
  imports: [MatDialogModule, MatButtonModule],
  template: `
    <h2 mat-dialog-title class="dialog-title">{{ data.title }}</h2>
    <mat-dialog-content class="dialog-content">
      <p>{{ data.message }}</p>
    </mat-dialog-content>
    <mat-dialog-actions align="end" class="dialog-actions">
      <button mat-button (click)="onCancel()" class="btn-cancel">
        {{ data.cancelLabel || 'Cancelar' }}
      </button>
      <button
        mat-flat-button
        [class.btn-destructive]="data.destructive"
        (click)="onConfirm()"
        cdkFocusInitial
      >
        {{ data.confirmLabel || 'Confirmar' }}
      </button>
    </mat-dialog-actions>
  `,
  styles: [
    `
      :host {
        display: block;
        max-width: 420px;
      }
      .dialog-title {
        color: var(--mat-sys-on-surface);
        font: var(--mat-sys-title-medium);
        margin: 0;
        padding: 20px 24px 8px;
      }
      .dialog-content {
        color: var(--mat-sys-on-surface-variant);
        font: var(--mat-sys-body-medium);
        padding: 8px 24px 20px;
        p {
          margin: 0;
        }
      }
      .dialog-actions {
        padding: 12px 24px 20px;
        gap: 8px;
      }
      .btn-destructive {
        --mdc-filled-button-container-color: var(--mat-sys-error);
        --mdc-filled-button-label-text-color: var(--mat-sys-on-error);
      }
    `,
  ],
})
export class ConfirmDialogComponent {
  readonly data = inject<ConfirmDialogData>(MAT_DIALOG_DATA);
  private readonly dialogRef = inject(MatDialogRef<ConfirmDialogComponent>);

  onCancel(): void {
    this.dialogRef.close(false);
  }

  onConfirm(): void {
    this.dialogRef.close(true);
  }
}
