import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [RouterLink, MatButtonModule],
  template: `
    <div class="home-container">
      <h1 class="type-headline">Bem-vindo ao Closed CRAS</h1>
      <p class="type-body">Sistema de Gestão de Salas e Recursos — PUCRS</p>
      <div class="home-actions">
        <a mat-flat-button color="primary" routerLink="/salas">Acessar Salas de Aula</a>
      </div>
    </div>
  `,
  styles: [
    `
      .home-container {
        padding: var(--spacing-page);
      }
      .home-actions {
        margin-top: 16px;
      }
    `,
  ],
})
export class HomePage {}
