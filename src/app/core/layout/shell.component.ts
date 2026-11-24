import {
  Component,
  ElementRef,
  HostListener,
  ViewChild,
  inject,
  signal,
  computed,
  DestroyRef,
} from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { BreakpointObserver } from '@angular/cdk/layout';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatSidenav, MatSidenavModule } from '@angular/material/sidenav';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { AuthService } from '../auth/auth.service';
import { NavDrawerComponent } from './nav-drawer.component';

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [
    RouterOutlet,
    MatToolbarModule,
    MatSidenavModule,
    MatButtonModule,
    MatIconModule,
    NavDrawerComponent,
  ],
  template: `
    <div class="shell-layout">
      <!-- App Bar (64dp) with tertiary bottom accent line (4dp) -->
      <header class="app-header">
        <mat-toolbar class="app-bar">
          @if (!isExpanded()) {
            <button
              #menuButton
              mat-icon-button
              (click)="toggleDrawer()"
              aria-label="Abrir menu de navegação"
              class="menu-button"
            >
              <mat-icon aria-hidden="true">menu</mat-icon>
            </button>
          }

          <div class="brand-group">
            <span class="brand-title type-title">Closed CRAS</span>
            @if (!isCompact()) {
              <span class="brand-caption type-caption">PUCRS · ConstrSW</span>
            }
          </div>

          <span class="spacer"></span>

          <div class="user-area">
            @if (identity(); as user) {
              @if (!isCompact()) {
                <div class="user-meta">
                  <span class="user-email type-body">{{ user.email }}</span>
                </div>
              }
              <span class="user-avatar" [attr.aria-label]="user.email">{{ userInitials() }}</span>
            }
            <button
              mat-button
              (click)="onLogout()"
              class="btn-logout"
              aria-label="Encerrar sessão"
            >
              Sair
            </button>
          </div>
        </mat-toolbar>
        <div class="tertiary-bar" aria-hidden="true"></div>
      </header>

      <!-- Sidenav Container -->
      <mat-sidenav-container class="sidenav-container" (backdropClick)="closeModalDrawer()">
        <mat-sidenav
          #drawer
          [mode]="isExpanded() ? 'side' : 'over'"
          [opened]="isExpanded()"
          [disableClose]="true"
          [autoFocus]="!isExpanded() ? 'first-tabbable' : 'dialog'"
          class="nav-sidenav"
          [attr.role]="isExpanded() ? 'navigation' : 'dialog'"
          [attr.aria-label]="'Menu principal'"
          (closedStart)="restoreMenuFocus()"
          (closed)="restoreMenuFocus()"
        >
          <app-nav-drawer (itemClicked)="onNavItemClicked()"></app-nav-drawer>
        </mat-sidenav>

        <mat-sidenav-content class="main-content" [class.compact-padding]="isCompact()">
          <main id="main-content" tabindex="-1">
            <router-outlet></router-outlet>
          </main>
        </mat-sidenav-content>
      </mat-sidenav-container>
    </div>
  `,
  styles: [
    `
      .shell-layout {
        display: flex;
        flex-direction: column;
        height: 100vh;
        overflow: hidden;
        background-color: var(--color-background);
      }

      .app-header {
        position: relative;
        z-index: 100;
        box-shadow: 0 1px 3px rgba(10, 37, 64, 0.08);
      }

      .app-bar {
        height: var(--header-height);
        background-color: var(--color-surface-container-lowest) !important;
        color: var(--color-foreground) !important;
        padding: 0 16px;
        display: flex;
        align-items: center;
      }

      .tertiary-bar {
        height: var(--tertiary-bar-height);
        background-color: var(--color-tertiary);
        width: 100%;
      }

      .menu-button {
        margin-right: 8px;
        width: 40px;
        height: 40px;
        color: var(--color-foreground);
      }

      .brand-group {
        display: flex;
        flex-direction: column;
        justify-content: center;
      }

      .brand-title {
        font-weight: 700;
        color: var(--color-primary);
        line-height: 1.2;
      }

      .brand-caption {
        color: var(--color-on-surface-variant);
        font-size: 11px;
        letter-spacing: 0.5px;
      }

      .spacer {
        flex: 1 1 auto;
      }

      .user-area {
        display: flex;
        align-items: center;
        gap: 12px;
      }

      .user-meta {
        display: flex;
        flex-direction: column;
        align-items: flex-end;
      }

      .user-email {
        color: var(--color-foreground);
        font-weight: 600;
      }

      .user-avatar {
        width: 32px;
        height: 32px;
        border-radius: 16px;
        background-color: var(--color-secondary);
        color: #ffffff;
        display: inline-grid;
        place-items: center;
        font-weight: 600;
        font-size: 13px;
        flex: none;
        user-select: none;
      }

      .btn-logout {
        height: 40px;
        color: var(--color-primary);
      }

      @media (max-width: 599px) {
        .brand-caption,
        .user-meta {
          display: none !important;
        }
        .app-bar {
          padding: 0 8px;
        }
        .user-area {
          gap: 8px;
        }
      }

      .sidenav-container {
        flex: 1;
        height: calc(100vh - var(--header-height) - var(--tertiary-bar-height));
      }

      .nav-sidenav {
        width: var(--sidebar-width);
        background-color: var(--color-surface-container-lowest);
        border-right: 1px solid var(--color-outline);
      }

      .main-content {
        padding: var(--spacing-page);
        overflow-y: auto;
        background-color: var(--color-background);

        &.compact-padding {
          padding: var(--spacing-page-compact);
        }
      }
    `,
  ],
})
export class ShellComponent {
  private readonly breakpointObserver = inject(BreakpointObserver);
  private readonly authService = inject(AuthService);
  private readonly destroyRef = inject(DestroyRef);

  @ViewChild('drawer') drawer!: MatSidenav;
  @ViewChild('menuButton', { read: ElementRef }) menuButton?: ElementRef<HTMLButtonElement>;

  readonly isExpanded = signal<boolean>(false);
  readonly isCompact = signal<boolean>(false);
  readonly identity = this.authService.identity;
  readonly userInitials = computed(() => {
    const email = this.identity()?.email ?? '';
    const localPart = email.split('@')[0] || 'U';
    const segments = localPart.split(/[._-]+/).filter(Boolean);
    if (segments.length >= 2) {
      return (segments[0][0] + segments[1][0]).toUpperCase();
    }
    return localPart.slice(0, 2).toUpperCase();
  });

  constructor() {
    this.breakpointObserver
      .observe(['(min-width: 1024px)', '(max-width: 599px)'])
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((result) => {
        const expanded = result.breakpoints['(min-width: 1024px)'] ?? false;
        const compact = result.breakpoints['(max-width: 599px)'] ?? false;
        this.isExpanded.set(expanded);
        this.isCompact.set(compact);
      });
  }

  toggleDrawer(): void {
    if (this.drawer?.opened) {
      this.closeModalDrawer();
    } else {
      this.drawer?.open();
    }
  }

  closeModalDrawer(): void {
    if (!this.isExpanded() && this.drawer?.opened) {
      void this.drawer.close().then(() => {
        this.restoreMenuFocus();
      });
      this.restoreMenuFocus();
    }
  }

  onNavItemClicked(): void {
    this.closeModalDrawer();
  }

  restoreMenuFocus(): void {
    if (!this.isExpanded()) {
      const btn = this.menuButton?.nativeElement;
      btn?.focus();
      setTimeout(() => btn?.focus(), 0);
    }
  }

  @HostListener('document:keydown.escape', ['$event'])
  onEscape(event?: Event): void {
    if (!this.isExpanded() && this.drawer?.opened) {
      event?.preventDefault();
      this.closeModalDrawer();
    }
  }

  async onLogout(): Promise<void> {
    await this.authService.logout();
  }
}

