import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { AuthService } from '../../core/auth/auth.service';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterLink, MatButtonModule, MatCardModule],
  template: `
    <div class="home-container">
      <mat-card class="welcome-card">
        <mat-card-header>
          <mat-card-title class="display-large">Bem-vindo ao Closed CRAS</mat-card-title>
          <mat-card-subtitle class="body-medium">
            Sistema Integrado de Gestão Acadêmica · PUCRS
          </mat-card-subtitle>
        </mat-card-header>
        <mat-card-content>
          <p class="body-medium">
            Você está autenticado como <strong>{{ authService.identity()?.email || 'Usuário' }}</strong>.
          </p>
          <p class="body-medium">
            Acesse o gerenciamento de salas de aula e seus recursos de acessibilidade.
          </p>
        </mat-card-content>
        <mat-card-actions>
          <a mat-flat-button color="primary" routerLink="/salas">Ver Salas de Aula</a>
        </mat-card-actions>
      </mat-card>
    </div>
  `,
  styles: [`
    .home-container {
      padding: var(--page-padding);
      display: flex;
      justify-content: center;
      align-items: flex-start;
    }
    .welcome-card {
      max-width: 600px;
      width: 100%;
      background: var(--color-surface-container-lowest);
      border-radius: var(--radius-lg);
      border: 1px solid var(--color-outline);
      box-shadow: 0 2px 4px rgba(10, 37, 64, 0.08);
      padding: 16px;
    }
    mat-card-actions {
      padding: 16px 0 0;
    }
  `],
})
export class HomePage {
  readonly authService = inject(AuthService);
}
