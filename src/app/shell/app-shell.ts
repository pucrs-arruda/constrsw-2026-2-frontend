import { BreakpointObserver } from '@angular/cdk/layout';
import { HttpErrorResponse } from '@angular/common/http';
import {
  Component,
  DestroyRef,
  ElementRef,
  HostListener,
  OnInit,
  ViewChild,
  effect,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatToolbarModule } from '@angular/material/toolbar';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { finalize, map } from 'rxjs';
import { AuthSession } from './auth-session';
import {
  IdentityApi,
  identityDisplayName,
  identityInitials,
} from './identity-api';
import { NAV_ITEMS } from './nav-items';

const EXPANDED_QUERY = '(min-width: 1024px)';
const COMPACT_QUERY = '(max-width: 599.98px)';

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    MatToolbarModule,
    MatSidenavModule,
    MatListModule,
    MatButtonModule,
    MatIconModule,
  ],
  templateUrl: './app-shell.html',
  styleUrl: './app-shell.scss',
})
export class AppShell implements OnInit {
  @ViewChild('menuButton', { read: ElementRef })
  private menuButton?: ElementRef<HTMLButtonElement>;

  private readonly breakpoints = inject(BreakpointObserver);
  private readonly identityApi = inject(IdentityApi);
  private readonly session = inject(AuthSession);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  readonly navItems = NAV_ITEMS;
  readonly identityFallback = 'Identidade indisponível.';
  readonly sidenavId = 'app-shell-nav';

  readonly displayName = signal<string | null>(null);
  readonly initials = signal('?');
  readonly identityUnavailable = signal(false);
  readonly loggingOut = signal(false);
  /** Modal sheet open state (&lt;1024). Expanded drawer stays open via mode. */
  readonly sheetOpen = signal(false);

  readonly isExpanded = toSignal(
    this.breakpoints.observe(EXPANDED_QUERY).pipe(map((r) => r.matches)),
    { initialValue: this.breakpoints.isMatched(EXPANDED_QUERY) },
  );

  readonly isCompact = toSignal(
    this.breakpoints.observe(COMPACT_QUERY).pipe(map((r) => r.matches)),
    { initialValue: this.breakpoints.isMatched(COMPACT_QUERY) },
  );

  constructor() {
    effect(() => {
      if (this.isExpanded()) {
        this.sheetOpen.set(false);
      }
    });
  }

  ngOnInit(): void {
    this.identityApi
      .me()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (me) => {
          const name = identityDisplayName(me);
          if (!name) {
            this.identityUnavailable.set(true);
            this.displayName.set(null);
            this.initials.set('?');
            return;
          }
          this.identityUnavailable.set(false);
          this.displayName.set(name);
          this.initials.set(identityInitials(me));
        },
        error: (err: unknown) => {
          if (err instanceof HttpErrorResponse && err.status === 401) {
            this.session.clear();
            void this.router.navigateByUrl('/login');
            return;
          }
          this.identityUnavailable.set(true);
          this.displayName.set(null);
          this.initials.set('?');
        },
      });
  }

  @HostListener('document:keydown.escape')
  onDocumentEscape(): void {
    if (!this.isExpanded() && this.sheetOpen()) {
      this.sheetOpen.set(false);
      queueMicrotask(() => this.menuButton?.nativeElement.focus());
    }
  }

  sidenavMode(): 'side' | 'over' {
    return this.isExpanded() ? 'side' : 'over';
  }

  sidenavOpened(): boolean {
    return this.isExpanded() ? true : this.sheetOpen();
  }

  menuAriaLabel(): string {
    if (this.isExpanded()) {
      return 'Menu de navegação';
    }
    return this.sheetOpen()
      ? 'Fechar menu de navegação'
      : 'Abrir menu de navegação';
  }

  toggleSheet(): void {
    if (this.isExpanded()) {
      return;
    }
    this.sheetOpen.update((open) => !open);
  }

  closeSheet(): void {
    if (!this.isExpanded()) {
      this.sheetOpen.set(false);
    }
  }

  onNavItemClick(): void {
    this.closeSheet();
  }

  onSidenavOpenedChange(opened: boolean): void {
    if (this.isExpanded()) {
      return;
    }
    this.sheetOpen.set(opened);
  }

  onSidenavClosed(): void {
    if (this.isExpanded()) {
      return;
    }
    queueMicrotask(() => this.menuButton?.nativeElement.focus());
  }

  onLogout(): void {
    if (this.loggingOut()) {
      return;
    }
    this.loggingOut.set(true);
    this.session
      .logout()
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.loggingOut.set(false)),
      )
      .subscribe({
        next: () => {
          void this.router.navigateByUrl('/login');
        },
      });
  }

  identityLabel(): string {
    if (this.identityUnavailable()) {
      return this.identityFallback;
    }
    return this.displayName() ?? '';
  }
}
