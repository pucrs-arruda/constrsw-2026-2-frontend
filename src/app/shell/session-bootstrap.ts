import { Injectable, inject } from '@angular/core';
import { Observable, catchError, finalize, map, of, shareReplay } from 'rxjs';
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
      // Concurrent guards share the in-flight boot; once it settles, drop it. Keeping the cached
      // `true` forever made the guards believe an expired (cleared) session was still valid, so
      // `/login` bounced back to `/` and the user stayed stuck without a token.
      finalize(() => {
        this.bootInFlight = null;
      }),
      shareReplay({ bufferSize: 1, refCount: false }),
    );
    return this.bootInFlight;
  }
}
