import { Component, EventEmitter, Input, Output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-empty-state',
  standalone: true,
  imports: [MatButtonModule, MatIconModule],
  template: `
    <div class="empty-state">
      <div class="empty-icon-wrap">
        <mat-icon class="empty-icon" aria-hidden="true">inbox</mat-icon>
      </div>
      <p class="type-title empty-message">{{ message }}</p>
      @if (actionLabel) {
        <button mat-flat-button color="primary" class="empty-action" (click)="action.emit()">
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
        background-color: var(--color-surface-container-lowest);
        border: 1px dashed var(--color-outline);
        border-radius: var(--radius-lg);
        margin: 16px 0;
      }
      .empty-icon-wrap {
        width: 56px;
        height: 56px;
        border-radius: var(--radius-full);
        background-color: var(--color-surface-container);
        display: flex;
        align-items: center;
        justify-content: center;
        margin-bottom: 16px;
      }
      .empty-icon {
        color: var(--color-primary);
        font-size: 28px;
        width: 28px;
        height: 28px;
      }
      .empty-message {
        color: var(--color-on-surface-variant);
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
