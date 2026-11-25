import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, map, throwError } from 'rxjs';
import { environment } from '../../environments/environment';

/** oauth token body (201). */
export interface OauthTokenResponse {
  token_type: string;
  access_token: string;
  expires_in: number;
  refresh_token?: string;
  refresh_expires_in?: number;
}

export type OauthFailureKind = 'credentials_rejected' | 'identity_unavailable' | 'unknown';

export class OauthRequestError extends Error {
  constructor(
    readonly kind: OauthFailureKind,
    readonly status: number | null,
    message: string,
  ) {
    super(message);
    this.name = 'OauthRequestError';
  }
}

@Injectable({ providedIn: 'root' })
export class OauthApi {
  private readonly http = inject(HttpClient);
  private readonly base = environment.oauthBaseUrl.replace(/\/$/, '');

  login(username: string, password: string): Observable<OauthTokenResponse> {
    if (!username?.trim() || !password) {
      return throwError(
        () =>
          new OauthRequestError(
            'credentials_rejected',
            null,
            'Não foi possível entrar. Verifique usuário e senha.',
          ),
      );
    }
    const body = new FormData();
    body.append('username', username);
    body.append('password', password);
    return this.http
      .post<OauthTokenResponse>(`${this.base}/login`, body, {
        withCredentials: true,
      })
      .pipe(catchError((err) => throwError(() => this.mapError(err, 'login'))));
  }

  refresh(): Observable<OauthTokenResponse> {
    return this.http
      .post<OauthTokenResponse>(
        `${this.base}/refresh`,
        {},
        { withCredentials: true },
      )
      .pipe(catchError((err) => throwError(() => this.mapError(err, 'refresh'))));
  }

  logout(): Observable<void> {
    return this.http
      .post<{ status: string }>(
        `${this.base}/logout`,
        {},
        { withCredentials: true },
      )
      .pipe(
        map(() => undefined),
        catchError((err) => throwError(() => this.mapError(err, 'logout'))),
      );
  }

  private mapError(err: unknown, op: string): OauthRequestError {
    if (err instanceof HttpErrorResponse) {
      if (err.status === 401) {
        if (op === 'refresh') {
          return new OauthRequestError(
            'credentials_rejected',
            401,
            'Sessão expirada. Entre novamente.',
          );
        }
        return new OauthRequestError(
          'credentials_rejected',
          401,
          'Não foi possível entrar. Verifique usuário e senha.',
        );
      }
      if (err.status === 0 || err.status === 502 || err.status === 503 || err.status === 504) {
        return new OauthRequestError(
          'identity_unavailable',
          err.status === 0 ? null : err.status,
          'Identidade indisponível.',
        );
      }
      return new OauthRequestError(
        'unknown',
        err.status || null,
        `Falha oauth (${op}): ${err.status}`,
      );
    }
    return new OauthRequestError('unknown', null, `Falha oauth (${op})`);
  }
}
