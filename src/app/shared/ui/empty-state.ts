import { Component, input } from '@angular/core';

@Component({
  selector: 'app-empty-state',
  standalone: true,
  templateUrl: './empty-state.html',
  styleUrl: './empty-state.scss',
})
export class EmptyState {
  /** Heading text (named heading to avoid native `title` attr collision). */
  readonly heading = input.required<string>({ alias: 'title' });
  readonly message = input('');
}
