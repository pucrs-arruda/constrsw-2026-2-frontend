import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
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
  imports: [CommonModule, MatDialogModule, MatButtonModule],
  template: `
    <div class="confirm-dialog-container" role="dialog" [attr.aria-labelledby]="'confirm-dialog-title'">
      <h2 mat-dialog-title id="confirm-dialog-title" class="title-medium dialog-title">
        {{ data.title }}
      </h2>

      <mat-dialog-content class="dialog-content">
        <p class="body-medium dialog-message">{{ data.message }}</p>
      </mat-dialog-content>

      <mat-dialog-actions align="end" class="dialog-actions">
        <button
          mat-button
          type="button"
          (click)="onCancel()"
          class="cancel-button"
        >
          {{ data.cancelLabel || 'Cancelar' }}
        </button>
        <button
          mat-flat-button
          type="button"
          [color]="data.destructive ? 'warn' : 'primary'"
          [class.destructive-button]="data.destructive"
          cdkFocusInitial
          (click)="onConfirm()"
        >
          {{ data.confirmLabel || 'Confirmar' }}
        </button>
      </mat-dialog-actions>
    </div>
  `,
  styles: [`
    .confirm-dialog-container {
      max-width: 400px;
      padding: 8px;
    }
    .dialog-title {
      margin: 0;
      color: var(--color-foreground);
      font-weight: 600;
    }
    .dialog-content {
      padding: 16px 0;
    }
    .dialog-message {
      margin: 0;
      color: var(--color-on-surface-variant);
      line-height: 1.5;
    }
    .dialog-actions {
      display: flex;
      gap: 8px;
      padding-top: 16px;
    }
    .destructive-button {
      background-color: var(--color-destructive) !important;
      color: var(--color-destructive-foreground) !important;
    }
  `],
})
export class ConfirmDialogComponent {
  readonly data: ConfirmDialogData = inject(MAT_DIALOG_DATA);
  readonly dialogRef = inject(MatDialogRef<ConfirmDialogComponent>);

  onConfirm(): void {
    this.dialogRef.close(true);
  }

  onCancel(): void {
    this.dialogRef.close(false);
  }
}
