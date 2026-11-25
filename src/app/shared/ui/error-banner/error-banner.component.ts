import { Component, EventEmitter, Input, Output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

/**
 * Falha de infraestrutura (rede, 503 da composição T3): a tela não tem o dado, mas a ação ainda
 * pode dar certo na próxima tentativa — por isso, ao contrário da recusa, este banner oferece
 * "Tentar novamente".
 */
@Component({
  selector: 'app-error-banner',
  standalone: true,
  imports: [MatButtonModule, MatIconModule],
  template: `
    <div class="error-banner" role="alert" aria-live="assertive">
      <div class="banner-body">
        <mat-icon class="banner-icon" aria-hidden="true">warning</mat-icon>
        <span class="banner-message">{{ message }}</span>
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
        background-color: var(--mat-sys-error-container);
        border: 1px solid var(--mat-sys-error);
        border-radius: var(--mat-sys-corner-medium);
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
        color: var(--mat-sys-error);
        font-size: 20px;
        width: 20px;
        height: 20px;
        flex-shrink: 0;
      }
      .banner-message {
        color: var(--mat-sys-on-error-container);
        font: var(--mat-sys-body-medium);
      }
      .btn-retry {
        --mdc-outlined-button-label-text-color: var(--mat-sys-error);
        --mdc-outlined-button-outline-color: var(--mat-sys-error);
      }
    `,
  ],
})
export class ErrorBannerComponent {
  @Input({ required: true }) message!: string;
  @Input() retryLabel = 'Tentar novamente';
  @Output() retry = new EventEmitter<void>();
}
