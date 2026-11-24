import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-refusal-banner',
  standalone: true,
  imports: [CommonModule],
  template: `
    @if (message) {
      <div class="refusal-banner" role="alert" aria-live="assertive">
        <span class="refusal-dot" aria-hidden="true"></span>
        <span class="refusal-message body-medium">{{ message }}</span>
      </div>
    }
  `,
  styles: [`
    .refusal-banner {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px 16px;
      background-color: var(--color-error-container);
      color: var(--color-error);
      border: 1px solid var(--color-error);
      border-radius: var(--radius-md);
      margin-bottom: 16px;
    }
    .refusal-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background-color: var(--color-error);
      flex-shrink: 0;
    }
    .refusal-message {
      font-weight: 500;
      color: var(--color-error);
    }
  `],
})
export class RefusalBannerComponent {
  @Input() message = '';
}
