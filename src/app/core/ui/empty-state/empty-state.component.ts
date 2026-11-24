import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';

@Component({
  selector: 'app-empty-state',
  standalone: true,
  imports: [CommonModule, MatButtonModule],
  template: `
    <div class="empty-state-container">
      <div class="empty-state-icon" aria-hidden="true">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
          <line x1="9" y1="9" x2="15" y2="15"></line>
          <line x1="15" y1="9" x2="9" y2="15"></line>
        </svg>
      </div>
      <p class="empty-state-message body-medium">{{ message }}</p>
      @if (actionLabel) {
        <button
          mat-flat-button
          color="primary"
          type="button"
          class="empty-state-action"
          (click)="action.emit()"
        >
          {{ actionLabel }}
        </button>
      }
    </div>
  `,
  styles: [`
    .empty-state-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 48px 24px;
      text-align: center;
      background: var(--color-surface-container-lowest);
      border: 1px dashed var(--color-outline);
      border-radius: var(--radius-lg);
      margin: 16px 0;
    }
    .empty-state-icon {
      color: var(--color-on-surface-variant);
      margin-bottom: 16px;
      opacity: 0.6;
    }
    .empty-state-message {
      color: var(--color-on-surface-variant);
      margin: 0 0 16px;
      max-width: 400px;
    }
    .empty-state-action {
      border-radius: var(--radius-full);
    }
  `],
})
export class EmptyStateComponent {
  @Input() message = '';
  @Input() actionLabel?: string;
  @Output() action = new EventEmitter<void>();
}
