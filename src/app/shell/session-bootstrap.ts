import { Injectable, inject } from '@angular/core';
import { Observable, catchError, map, of, shareReplay } from 'rxjs';
import { AuthSession } from './auth-session';

/**
 * One app-wide boot refresh when memory is empty (Story 0.3).
 * Guards share this so concurrent navigations do not spam /refresh.
 */
@Injectable({ providedIn: 'root' })
export class SessionBootstrap {
  private readonly session = inject(AuthSession);
  private bootStarted = false;
  private bootInFlight: Observable<boolean> | null = null;

  /**
   * Returns whether the SPA has an in-memory Bearer after at most one cold refresh.
   */
  ensureSession(): Observable<boolean> {
    if (this.session.isAuthenticated) {
      return of(true);
    }

    if (this.bootInFlight) {
      return this.bootInFlight;
    }

    if (this.bootStarted) {
      return of(false);
    }

    this.bootStarted = true;
    this.bootInFlight = this.session.refresh().pipe(
      map(() => true),
      catchError(() => of(false)),
      // Cache the terminal boolean for all concurrent guards; keep forever for this SPA load.
      shareReplay({ bufferSize: 1, refCount: false }),
    );
    return this.bootInFlight;
  }
}
