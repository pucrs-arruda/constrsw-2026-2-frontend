import { Component, EventEmitter, Input, Output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

/**
 * Lista vazia — estado normal, não erro: "Nenhuma sala cadastrada ainda." (EXPERIENCE.md).
 *
 * O texto é sempre em pt-BR e descreve o que falta, não o que o sistema fez. A ação é opcional:
 * só aparece quando quem está vendo pode criar o primeiro registro.
 */
@Component({
  selector: 'app-empty-state',
  standalone: true,
  imports: [MatButtonModule, MatIconModule],
  template: `
    <div class="empty-state">
      <div class="empty-icon-wrap">
        <mat-icon class="empty-icon" aria-hidden="true">inbox</mat-icon>
      </div>
      <p class="empty-message">{{ message }}</p>
      @if (actionLabel) {
        <button mat-flat-button class="empty-action" (click)="action.emit()">
          {{ actionLabel }}
        </button>
      }
    </div>
  `,
  styles: [
    `
      .empty-state {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: 48px 24px;
        text-align: center;
        background-color: var(--mat-sys-surface-container-lowest);
        border: 1px dashed var(--mat-sys-outline);
        border-radius: var(--mat-sys-corner-large);
        margin: 16px 0;
      }
      .empty-icon-wrap {
        width: 56px;
        height: 56px;
        border-radius: 50%;
        background-color: var(--mat-sys-surface-container);
        display: flex;
        align-items: center;
        justify-content: center;
        margin-bottom: 16px;
      }
      .empty-icon {
        color: var(--mat-sys-primary);
        font-size: 28px;
        width: 28px;
        height: 28px;
      }
      .empty-message {
        color: var(--mat-sys-on-surface-variant);
        font: var(--mat-sys-title-medium);
        margin: 0 0 16px;
      }
    `,
  ],
})
export class EmptyStateComponent {
  @Input({ required: true }) message!: string;
  @Input() actionLabel?: string;
  @Output() action = new EventEmitter<void>();
}
