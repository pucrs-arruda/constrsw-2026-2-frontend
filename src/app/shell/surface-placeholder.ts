import { Component, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';
import { map } from 'rxjs';

/** Shared placeholder for domain surfaces until their epics land. */
@Component({
  selector: 'app-surface-placeholder',
  standalone: true,
  templateUrl: './surface-placeholder.html',
  styleUrl: './surface-placeholder.scss',
})
export class SurfacePlaceholder {
  private readonly route = inject(ActivatedRoute);

  readonly title = toSignal(
    this.route.data.pipe(map((data) => (data['title'] as string) || 'Superfície')),
    { initialValue: 'Superfície' },
  );
}
