import { Component, Input } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-refusal-banner',
  standalone: true,
  imports: [MatIconModule],
  template: `
    <div class="refusal-banner" role="alert" aria-live="polite">
      <mat-icon class="banner-icon" aria-hidden="true">error</mat-icon>
      <span class="banner-message type-body">{{ message }}</span>
    </div>
  `,
  styles: [
    `
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
      .banner-icon {
        color: var(--color-error);
        font-size: 20px;
        width: 20px;
        height: 20px;
        flex-shrink: 0;
      }
      .banner-message {
        color: var(--color-error);
        flex: 1;
      }
    `,
  ],
})
export class RefusalBannerComponent {
  @Input({ required: true }) message!: string;
}
