import { Component, computed, input } from '@angular/core';
import { MatProgressBarModule } from '@angular/material/progress-bar';

@Component({
  selector: 'app-skeleton-block',
  standalone: true,
  imports: [MatProgressBarModule],
  templateUrl: './skeleton-block.html',
  styleUrl: './skeleton-block.scss',
})
export class SkeletonBlock {
  /** Number of placeholder rows (default 3). */
  readonly lines = input(3);

  /** Show indeterminate progress bar above lines. */
  readonly showProgress = input(true);

  /** Accessible label for cold-load region. */
  readonly label = input('Carregando…');

  readonly lineIndexes = computed(() =>
    Array.from({ length: Math.max(0, this.lines()) }, (_, i) => i),
  );
}
