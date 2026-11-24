import { Component, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';

@Component({
  selector: 'app-placeholder',
  standalone: true,
  imports: [RouterLink, MatButtonModule],
  template: `
    <div class="placeholder-container">
      <h1 class="type-headline">Área em desenvolvimento</h1>
      <p class="type-body">Esta área é de outro grupo e ainda não está disponível.</p>
      @if (slug()) {
        <p class="type-caption slug-info">Módulo: {{ slug() }}</p>
      }
      <div class="placeholder-actions">
        <a mat-stroked-button routerLink="/salas">Voltar para Salas de Aula</a>
      </div>
    </div>
  `,
  styles: [
    `
      .placeholder-container {
        padding: var(--spacing-page);
        display: flex;
        flex-direction: column;
        align-items: flex-start;
        gap: 12px;
      }
      .slug-info {
        color: var(--color-on-surface-variant);
      }
      .placeholder-actions {
        margin-top: 8px;
      }
    `,
  ],
})
export class PlaceholderPage {
  private readonly route = inject(ActivatedRoute);
  readonly slug = toSignal(this.route.paramMap.pipe(map((params) => params.get('slug'))));
}
