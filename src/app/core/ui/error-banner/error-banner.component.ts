import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';

@Component({
  selector: 'app-error-banner',
  standalone: true,
  imports: [CommonModule, MatButtonModule],
  template: `
    @if (message) {
      <div class="error-banner" role="alert" aria-live="assertive">
        <div class="content-side">
          <span class="error-dot" aria-hidden="true"></span>
          <span class="error-message body-medium">{{ message }}</span>
        </div>
        <button
          mat-stroked-button
          type="button"
          class="retry-button"
          (click)="retry.emit()"
        >
          {{ retryLabel }}
        </button>
      </div>
    }
  `,
  styles: [`
    .error-banner {
      display: flex;
      align-items: center;
      justify-content: space-between;
      flex-wrap: wrap;
      gap: 12px;
      padding: 12px 16px;
      background-color: var(--color-error-container);
      color: var(--color-error);
      border: 1px solid var(--color-error);
      border-radius: var(--radius-md);
      margin-bottom: 16px;
    }
    .content-side {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .error-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background-color: var(--color-error);
      flex-shrink: 0;
    }
    .error-message {
      font-weight: 500;
      color: var(--color-error);
    }
    .retry-button {
      border-color: var(--color-error) !important;
      color: var(--color-error) !important;
    }
  `],
})
export class ErrorBannerComponent {
  @Input() message = '';
  @Input() retryLabel = 'Tentar novamente';
  @Output() retry = new EventEmitter<void>();
}
