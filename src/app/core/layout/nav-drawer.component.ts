import { Component, EventEmitter, Output } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
import { NAV_ITEMS, NavItem } from './nav-items';

@Component({
  selector: 'app-nav-drawer',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, MatListModule, MatIconModule],
  template: `
    <nav class="nav-container" aria-label="Navegação principal">
      <mat-nav-list>
        @for (item of items; track item.route) {
          <a
            mat-list-item
            [routerLink]="item.route"
            routerLinkActive="active-nav-item"
            (click)="itemClicked.emit()"
            class="nav-link"
          >
            <mat-icon matListItemIcon class="nav-icon" aria-hidden="true">{{ item.icon }}</mat-icon>
            <span matListItemTitle class="nav-label type-label">{{ item.label }}</span>
          </a>
        }
      </mat-nav-list>
    </nav>
  `,
  styles: [
    `
      .nav-container {
        padding: 8px 0;
        width: var(--sidebar-width);
      }
      .nav-link {
        height: var(--nav-item-height);
        position: relative;
        margin: 2px 8px;
        border-radius: var(--radius-sm);
        transition: background-color 0.2s ease;

        &.active-nav-item {
          background-color: var(--color-primary-container) !important;
          color: var(--color-on-primary-container) !important;

          &::before {
            content: '';
            position: absolute;
            left: 0;
            top: 4px;
            bottom: 4px;
            width: 4px;
            background-color: var(--color-primary);
            border-radius: 0 var(--radius-sm) var(--radius-sm) 0;
          }

          .nav-icon {
            color: var(--color-primary) !important;
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
        font-family: var(--font-family-sans);
      }
    `,
  ],
})
export class NavDrawerComponent {
  readonly items: readonly NavItem[] = NAV_ITEMS;
  @Output() itemClicked = new EventEmitter<void>();
}
