import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-skeleton',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="skeleton-container" [class.variant-card]="variant === 'card'" [class.variant-table]="variant === 'table'" role="status" aria-busy="true" aria-label="Carregando conteúdo">
      @for (item of rowArray; track $index) {
        <div class="skeleton-row">
          @if (variant === 'table') {
            <div class="skeleton-cell w-20"></div>
            <div class="skeleton-cell w-40"></div>
            <div class="skeleton-cell w-25"></div>
            <div class="skeleton-cell w-15"></div>
          } @else {
            <div class="skeleton-card-block">
              <div class="skeleton-line w-60"></div>
              <div class="skeleton-line w-40"></div>
              <div class="skeleton-line w-80"></div>
            </div>
          }
        </div>
      }
    </div>
  `,
  styles: [`
    .skeleton-container {
      width: 100%;
      display: flex;
      flex-direction: column;
      gap: 12px;
      padding: 16px 0;
    }
    .skeleton-row {
      display: flex;
      align-items: center;
      gap: 16px;
      width: 100%;
    }
    .skeleton-cell,
    .skeleton-line {
      height: 20px;
      background: linear-gradient(
        90deg,
        var(--color-surface-container) 25%,
        var(--color-surface-container-high) 50%,
        var(--color-surface-container) 75%
      );
      background-size: 200% 100%;
      animation: skeleton-shimmer 1.5s infinite;
      border-radius: var(--radius-sm);
    }
    .skeleton-card-block {
      width: 100%;
      padding: 16px;
      background: var(--color-surface-container-lowest);
      border: 1px solid var(--color-outline-variant);
      border-radius: var(--radius-lg);
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    .w-15 { width: 15%; }
    .w-20 { width: 20%; }
    .w-25 { width: 25%; }
    .w-40 { width: 40%; }
    .w-60 { width: 60%; }
    .w-80 { width: 80%; }

    @keyframes skeleton-shimmer {
      0% {
        background-position: 200% 0;
      }
      100% {
        background-position: -200% 0;
      }
    }
  `],
})
export class SkeletonComponent {
  @Input() rows = 5;
  @Input() variant: 'table' | 'card' = 'table';

  get rowArray(): number[] {
    return Array.from({ length: this.rows }, (_, i) => i);
  }
}
