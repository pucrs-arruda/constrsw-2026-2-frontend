import { Component, Input } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';

/**
 * Recusa do servidor (401/403/409/422): o domínio disse não, e a tela mostra o porquê.
 *
 * Diferente do `app-error-banner`, não oferece "tentar novamente" — repetir a mesma requisição
 * daria a mesma recusa. Cores e raios saem dos tokens M3 do tema (`DESIGN.md`), nunca de valores
 * literais.
 */
@Component({
  selector: 'app-refusal-banner',
  standalone: true,
  imports: [MatIconModule],
  template: `
    <div class="refusal-banner" role="alert" aria-live="polite">
      <mat-icon class="banner-icon" aria-hidden="true">error</mat-icon>
      <span class="banner-message">{{ message }}</span>
    </div>
  `,
  styles: [
    `
      .refusal-banner {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 12px 16px;
        background-color: var(--mat-sys-error-container);
        border: 1px solid var(--mat-sys-error);
        border-radius: var(--mat-sys-corner-medium);
        margin-bottom: 16px;
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
        flex: 1;
      }
    `,
  ],
})
export class RefusalBannerComponent {
  @Input({ required: true }) message!: string;
}
