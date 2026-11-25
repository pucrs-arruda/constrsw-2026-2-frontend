import { Component, Input } from '@angular/core';

/**
 * Carregamento frio (EXPERIENCE.md): ocupa o espaço que o conteúdo vai ocupar, para a página não
 * pular quando os dados chegam. Não é spinner — o usuário já vê a forma da tabela.
 */
@Component({
  selector: 'app-skeleton',
  standalone: true,
  template: `
    <div
      class="skeleton-container"
      [class.skeleton-table]="variant === 'table'"
      [class.skeleton-card]="variant === 'card'"
      role="status"
      aria-label="Carregando dados..."
    >
      @for (item of rowArray; track $index) {
        <div class="skeleton-row">
          @if (variant === 'table') {
            <div class="skeleton-cell col-sm shimmer"></div>
            <div class="skeleton-cell col-md shimmer"></div>
            <div class="skeleton-cell col-lg shimmer"></div>
            <div class="skeleton-cell col-sm shimmer"></div>
          } @else {
            <div class="skeleton-card-block shimmer"></div>
          }
        </div>
      }
    </div>
  `,
  styles: [
    `
      .skeleton-container {
        display: flex;
        flex-direction: column;
        gap: 8px;
        width: 100%;
        margin: 16px 0;
      }
      .skeleton-row {
        display: flex;
        align-items: center;
        gap: 16px;
        min-height: 52px;
        padding: 0 16px;
        background-color: var(--mat-sys-surface-container-lowest);
        border-radius: var(--mat-sys-corner-small);
        border: 1px solid var(--mat-sys-outline-variant);
      }
      .skeleton-card-block {
        width: 100%;
        height: 60px;
        border-radius: var(--mat-sys-corner-small);
      }
      .skeleton-cell {
        height: 16px;
        border-radius: var(--mat-sys-corner-small);
      }
      .col-sm {
        width: 80px;
      }
      .col-md {
        width: 160px;
      }
      .col-lg {
        flex: 1;
      }
      .shimmer {
        background: linear-gradient(
          90deg,
          var(--mat-sys-surface-container) 0%,
          var(--mat-sys-surface-container-low) 50%,
          var(--mat-sys-surface-container) 100%
        );
        background-size: 200% 100%;
        animation: shimmer-animation 1.5s infinite;
      }
      /* Quem pediu menos movimento no sistema não precisa do brilho correndo na tela. */
      @media (prefers-reduced-motion: reduce) {
        .shimmer {
          animation: none;
        }
      }
      @keyframes shimmer-animation {
        0% {
          background-position: 200% 0;
        }
        100% {
          background-position: -200% 0;
        }
      }
    `,
  ],
})
export class SkeletonComponent {
  @Input() set rows(value: number) {
    this.rowArray = Array.from({ length: value }, (_, i) => i);
  }
  @Input() variant: 'table' | 'card' = 'table';

  rowArray: number[] = [0, 1, 2, 3, 4];
}
