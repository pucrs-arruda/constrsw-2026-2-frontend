import { Component, EventEmitter, Input, Output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-error-banner',
  standalone: true,
  imports: [MatButtonModule, MatIconModule],
  template: `
    <div class="error-banner" role="alert" aria-live="assertive">
      <div class="banner-body">
        <mat-icon class="banner-icon" aria-hidden="true">warning</mat-icon>
        <span class="banner-message type-body">{{ message }}</span>
      </div>
      <button mat-stroked-button class="btn-retry" (click)="retry.emit()">
        {{ retryLabel }}
      </button>
    </div>
  `,
  styles: [
    `
      .error-banner {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 16px;
        padding: 12px 16px;
        background-color: var(--color-error-container);
        border: 1px solid var(--color-error);
        border-radius: var(--radius-md);
        margin-bottom: 16px;
        flex-wrap: wrap;
      }
      .banner-body {
        display: flex;
        align-items: center;
        gap: 12px;
        flex: 1;
      }
      .banner-icon {
        color: var(--color-error);
        font-size: 20px;
        width: 20px;
        height: 20px;
        flex-shrink: 0;
      }
      .banner-message {
        color: var(--color-error);
      }
      .btn-retry {
        border-color: var(--color-error) !important;
        color: var(--color-error) !important;
      }
    `,
  ],
})
export class ErrorBannerComponent {
  @Input({ required: true }) message!: string;
  @Input() retryLabel: string = 'Tentar novamente';
  @Output() retry = new EventEmitter<void>();
}
