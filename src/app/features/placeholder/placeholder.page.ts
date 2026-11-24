import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';

@Component({
  selector: 'app-placeholder',
  standalone: true,
  imports: [CommonModule, RouterLink, MatButtonModule, MatCardModule],
  template: `
    <div class="placeholder-container">
      <mat-card class="placeholder-card">
        <mat-card-header>
          <mat-card-title class="headline-large">Em breve</mat-card-title>
          <mat-card-subtitle class="body-medium">Closed CRAS · Módulo em desenvolvimento</mat-card-subtitle>
        </mat-card-header>
        <mat-card-content>
          <p class="body-medium message">
            Esta área é de outro grupo e ainda não está disponível.
          </p>
        </mat-card-content>
        <mat-card-actions>
          <a mat-flat-button color="primary" routerLink="/salas">Ir para Salas de Aula</a>
        </mat-card-actions>
      </mat-card>
    </div>
  `,
  styles: [`
    .placeholder-container {
      padding: var(--page-padding);
      display: flex;
      justify-content: center;
      align-items: flex-start;
    }
    .placeholder-card {
      max-width: 560px;
      width: 100%;
      background: var(--color-surface-container-lowest);
      border-radius: var(--radius-lg);
      border: 1px solid var(--color-outline);
      padding: 16px;
    }
    .message {
      margin: 16px 0;
      color: var(--color-on-surface-variant);
    }
  `],
})
export class PlaceholderPage {
  readonly route = inject(ActivatedRoute);
}
