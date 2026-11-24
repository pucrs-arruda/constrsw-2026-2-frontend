import { Component, ViewChild, ElementRef, inject, signal, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';
import { BreakpointObserver } from '@angular/cdk/layout';
import { MatSidenavModule, MatSidenav } from '@angular/material/sidenav';
import { AppBarComponent } from './app-bar.component';
import { NavDrawerComponent } from './nav-drawer.component';

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [CommonModule, RouterOutlet, MatSidenavModule, AppBarComponent, NavDrawerComponent],
  template: `
    <div class="shell-layout">
      <app-bar
        [showMenuButton]="!isExpanded()"
        [isCompact]="isCompact()"
        (menuToggle)="toggleSidenav()"
      />

      <mat-sidenav-container class="sidenav-container">
        <mat-sidenav
          #sidenav
          [mode]="isExpanded() ? 'side' : 'over'"
          [opened]="isExpanded()"
          (closed)="onSidenavClosed()"
          (keydown.escape)="closeSidenavOnEscape($event)"
          class="sidenav"
          aria-label="Navegação secundária"
        >
          <app-nav-drawer (itemSelected)="onNavItemClicked()" />
        </mat-sidenav>

        <mat-sidenav-content class="main-content">
          <main class="page-body">
            <router-outlet />
          </main>
        </mat-sidenav-content>
      </mat-sidenav-container>
    </div>
  `,
  styles: [`
    .shell-layout {
      display: flex;
      flex-direction: column;
      height: 100vh;
      width: 100vw;
      overflow: hidden;
      background-color: var(--color-background);
    }
    .sidenav-container {
      flex: 1;
      height: calc(100vh - var(--header-height) - var(--tertiary-strip-height));
    }
    .sidenav {
      width: var(--sidebar-width);
      border-right: 1px solid var(--color-outline);
    }
    .main-content {
      background-color: var(--color-background);
      overflow-y: auto;
    }
    .page-body {
      min-height: 100%;
      box-sizing: border-box;
    }
  `],
})
export class ShellComponent {
  private readonly breakpointObserver = inject(BreakpointObserver);

  @ViewChild('sidenav') sidenav?: MatSidenav;
  @ViewChild(AppBarComponent, { read: ElementRef }) appBarRef?: ElementRef;

  readonly isExpanded = signal<boolean>(true);
  readonly isCompact = signal<boolean>(false);

  constructor() {
    this.breakpointObserver
      .observe(['(min-width: 1024px)', '(max-width: 599.98px)'])
      .subscribe((result) => {
        const expanded = result.breakpoints['(min-width: 1024px)'];
        const compact = result.breakpoints['(max-width: 599.98px)'];
        this.isExpanded.set(expanded);
        this.isCompact.set(compact);

        if (this.sidenav) {
          if (expanded) {
            this.sidenav.open();
          } else {
            this.sidenav.close();
          }
        }
      });
  }

  toggleSidenav(): void {
    if (this.sidenav) {
      this.sidenav.toggle();
    }
  }

  onNavItemClicked(): void {
    if (!this.isExpanded() && this.sidenav) {
      this.sidenav.close();
    }
  }

  closeSidenavOnEscape(event: Event): void {
    if (!this.isExpanded() && this.sidenav) {
      event.preventDefault();
      this.sidenav.close();
    }
  }

  onSidenavClosed(): void {
    if (!this.isExpanded()) {
      // Return focus to menu button when drawer closes
      const menuButton = document.querySelector('.menu-button') as HTMLElement;
      menuButton?.focus();
    }
  }
}
