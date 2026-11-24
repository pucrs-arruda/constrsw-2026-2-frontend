import { Component, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
import { NAV_ITEMS, NavItem } from './nav-items';

@Component({
  selector: 'app-nav-drawer',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive, MatListModule, MatIconModule],
  template: `
    <nav class="nav-drawer" aria-label="Menu principal">
      <mat-nav-list class="nav-list">
        @for (item of items; track item.route) {
          <a
            mat-list-item
            [routerLink]="item.route"
            routerLinkActive="active"
            [routerLinkActiveOptions]="{ exact: false }"
            (click)="itemSelected.emit(item)"
            class="nav-item"
          >
            <mat-icon matListItemIcon class="nav-icon">{{ item.icon }}</mat-icon>
            <span matListItemTitle class="nav-label body-medium">{{ item.label }}</span>
          </a>
        }
      </mat-nav-list>
    </nav>
  `,
  styles: [`
    .nav-drawer {
      width: var(--sidebar-width);
      height: 100%;
      background-color: var(--color-surface);
      border-right: 1px solid var(--color-outline);
      box-sizing: border-box;
    }
    .nav-list {
      padding-top: 8px;
    }
    .nav-item {
      height: 56px !important;
      border-left: 4px solid transparent;
      transition: background-color 0.15s ease, border-color 0.15s ease;
      color: var(--color-on-surface);

      &:hover {
        background-color: var(--color-surface-container);
      }

      &.active {
        background-color: var(--color-primary-container) !important;
        border-left-color: var(--color-primary);
        color: var(--color-primary);

        .nav-icon {
          color: var(--color-primary);
        }
        .nav-label {
          color: var(--color-primary);
          font-weight: 600;
        }
      }
    }
    .nav-icon {
      font-size: 24px;
      width: 24px;
      height: 24px;
      margin-right: 16px;
      color: var(--color-on-surface-variant);
    }
    .nav-label {
      font-size: 14px;
    }
  `],
})
export class NavDrawerComponent {
  readonly items: NavItem[] = NAV_ITEMS;
  @Output() itemSelected = new EventEmitter<NavItem>();
}
