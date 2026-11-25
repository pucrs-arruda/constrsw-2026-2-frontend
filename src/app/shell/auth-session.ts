import { Injectable, inject } from '@angular/core';
import { Observable, catchError, map, of, throwError } from 'rxjs';
import { OauthApi, OauthRequestError, type OauthTokenResponse } from './oauth-api';

/**
 * In-memory oauth session (Story 0.2).
 * Access token stays in SPA memory only (no durable browser storage).
 */
@Injectable({ providedIn: 'root' })
export class AuthSession {
  private readonly oauth = inject(OauthApi);
  private accessTokenValue: string | null = null;

  get accessToken(): string | null {
    return this.accessTokenValue;
  }

  get isAuthenticated(): boolean {
    return this.accessTokenValue !== null;
  }

  login(username: string, password: string): Observable<void> {
    return this.oauth.login(username, password).pipe(
      map((tokens) => {
        this.storeAccessToken(tokens);
      }),
      catchError((err: unknown) => {
        this.clear();
        return throwError(() => err);
      }),
    );
  }

  refresh(): Observable<void> {
    return this.oauth.refresh().pipe(
      map((tokens) => {
        this.storeAccessToken(tokens);
      }),
      catchError((err: unknown) => {
        this.clear();
        return throwError(() => err);
      }),
    );
  }

  logout(): Observable<void> {
    return this.oauth.logout().pipe(
      map(() => {
        this.clear();
      }),
      catchError(() => {
        // Best-effort server logout; always clear local session.
        this.clear();
        return of(undefined);
      }),
    );
  }

  clear(): void {
    this.accessTokenValue = null;
  }

  /** Test/helper: apply tokens without HTTP (e.g. after mocked login). */
  applyTokens(tokens: Pick<OauthTokenResponse, 'access_token'>): void {
    this.storeAccessToken(tokens);
  }

  private storeAccessToken(tokens: Pick<OauthTokenResponse, 'access_token'>): void {
    if (!tokens.access_token) {
      this.clear();
      throw new OauthRequestError('unknown', null, 'Resposta oauth sem access_token');
    }
    this.accessTokenValue = tokens.access_token;
  }
}
