import { Component, inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';

export interface ConfirmDialogData {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
}

@Component({
  selector: 'app-confirm-dialog',
  standalone: true,
  imports: [MatDialogModule, MatButtonModule],
  template: `
    <h2 mat-dialog-title class="type-title dialog-title">{{ data.title }}</h2>
    <mat-dialog-content class="dialog-content">
      <p class="type-body">{{ data.message }}</p>
    </mat-dialog-content>
    <mat-dialog-actions align="end" class="dialog-actions">
      <button mat-button (click)="onCancel()" class="btn-cancel">
        {{ data.cancelLabel || 'Cancelar' }}
      </button>
      <button
        mat-flat-button
        [color]="data.destructive ? 'warn' : 'primary'"
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
        max-width: var(--dialog-width-confirm);
      }
      .dialog-title {
        color: var(--color-foreground);
        margin: 0;
        padding: 20px 24px 8px;
      }
      .dialog-content {
        color: var(--color-on-surface-variant);
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
        background-color: var(--color-error) !important;
        color: var(--color-on-error) !important;
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
