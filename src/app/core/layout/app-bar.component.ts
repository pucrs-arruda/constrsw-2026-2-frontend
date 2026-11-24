import { Component, Input, Output, EventEmitter, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { AuthService } from '../auth/auth.service';

@Component({
  selector: 'app-bar',
  standalone: true,
  imports: [CommonModule, MatToolbarModule, MatButtonModule, MatIconModule],
  template: `
    <header class="app-bar-header">
      <div class="tertiary-strip" aria-hidden="true"></div>
      <mat-toolbar class="toolbar">
        @if (showMenuButton) {
          <button
            mat-icon-button
            type="button"
            class="menu-button"
            aria-label="Abrir menu de navegação"
            (click)="menuToggle.emit()"
            #menuBtn
          >
            <mat-icon>menu</mat-icon>
          </button>
        }

        <div class="brand">
          <span class="brand-title">Closed CRAS</span>
          @if (!isCompact) {
            <span class="brand-caption caption">PUCRS · ConstrSW</span>
          }
        </div>

        <span class="spacer"></span>

        <div class="user-area">
          @if (!isCompact && identity(); as id) {
            <span class="user-email body-medium">{{ id.email }}</span>
          }
          <button
            mat-button
            type="button"
            class="logout-button"
            aria-label="Sair da sessão"
            (click)="onLogout()"
          >
            Sair
          </button>
        </div>
      </mat-toolbar>
    </header>
  `,
  styles: [`
    .app-bar-header {
      position: sticky;
      top: 0;
      z-index: 1000;
      box-shadow: 0 1px 3px rgba(10, 37, 64, 0.12);
    }
    .tertiary-strip {
      height: var(--tertiary-strip-height);
      background-color: var(--color-tertiary);
      width: 100%;
    }
    .toolbar {
      height: var(--header-height);
      background-color: var(--color-surface-container-lowest);
      color: var(--color-foreground);
      padding: 0 16px;
      display: flex;
      align-items: center;
    }
    .menu-button {
      margin-right: 12px;
      color: var(--color-foreground);
    }
    .brand {
      display: flex;
      align-items: baseline;
      gap: 8px;
    }
    .brand-title {
      font-size: 20px;
      font-weight: 700;
      color: var(--color-secondary);
      letter-spacing: -0.2px;
    }
    .brand-caption {
      color: var(--color-on-surface-variant);
    }
    .spacer {
      flex: 1 1 auto;
    }
    .user-area {
      display: flex;
      align-items: center;
      gap: 16px;
    }
    .user-email {
      color: var(--color-on-surface-variant);
      font-weight: 500;
    }
    .logout-button {
      color: var(--color-primary) !important;
      font-weight: 600;
    }
  `],
})
export class AppBarComponent {
  private readonly authService = inject(AuthService);

  @Input() showMenuButton = false;
  @Input() isCompact = false;
  @Output() menuToggle = new EventEmitter<void>();

  readonly identity = this.authService.identity;

  async onLogout(): Promise<void> {
    await this.authService.logout();
  }
}
