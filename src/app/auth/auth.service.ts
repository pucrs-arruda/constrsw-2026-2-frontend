import { HttpClient, HttpContext, HttpErrorResponse } from '@angular/common/http';
import { Injectable, Signal, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { APP_CONFIG } from '../shared/config/app-config';
import { SKIP_AUTH_RETRY, UNAVAILABLE_MESSAGE } from './auth-session';
import { Identity } from './identity.model';

export interface LoginError {
  kind: 'invalid' | 'unavailable' | 'validation';
  message: string;
}

interface TokenResponse {
  access_token: string;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly config = inject(APP_CONFIG);
  private readonly currentIdentity = signal<Identity | null>(null);
  private readonly token = signal<string | null>(null);
  private readonly refreshFailedUnavailable = signal(false);
  private refreshFlight?: Promise<boolean>;
  private logoutFlight?: Promise<void>;
  private session = 0;

  readonly refreshUnavailable = this.refreshFailedUnavailable.asReadonly();
  readonly accessToken = this.token.asReadonly();
  readonly identity: Signal<Identity | null> = this.currentIdentity.asReadonly();
  readonly isAuthenticated: Signal<boolean> = computed(() => this.identity() !== null);
  readonly isAdmin: Signal<boolean> = computed(
    () => this.identity()?.papeis.includes('administrator') ?? false,
  );
  readonly seesAllClasses: Signal<boolean> = computed(
    () => this.isAdmin() || (this.identity()?.papeis.includes('coordinator') ?? false),
  );

  get sessionVersion(): number {
    return this.session;
  }

  async login(username: string, password: string): Promise<void> {
    await this.logoutFlight;
    await this.refreshFlight;
    this.clearSession();
    const session = this.session;
    const form = new FormData();
    form.set('username', username);
    form.set('password', password);

    try {
      if (!(await this.requestToken('login', form, session))) {
        throw this.unavailable();
      }
      if (!(await this.loadIdentity())) {
        throw this.invalid();
      }
    } catch (error) {
      if (this.session === session) this.clearSession();
      if (error instanceof HttpErrorResponse) {
        if (error.status === 400) {
          const description = error.error?.error_description;
          throw {
            kind: 'validation',
            message:
              typeof description === 'string' && description
                ? description
                : 'Verifique os dados informados.',
          } satisfies LoginError;
        }
        throw error.status === 401 ? this.invalid() : this.unavailable();
      }
      throw error;
    }
  }

  async loadIdentity(): Promise<Identity | null> {
    const session = this.session;
    try {
      const identity = await firstValueFrom(
        this.http.get<Identity>(`${this.config.bffBaseUrl}/api/v1/identidade/me`, {
          withCredentials: true,
          context: new HttpContext().set(SKIP_AUTH_RETRY, true),
        }),
      );
      if (session !== this.session) return null;
      this.currentIdentity.set(identity);
      return identity;
    } catch (error) {
      if (session !== this.session) return null;
      if (error instanceof HttpErrorResponse && error.status === 401) {
        this.currentIdentity.set(null);
        return null;
      }
      throw this.unavailable();
    }
  }

  refresh(): Promise<boolean> {
    if (this.logoutFlight) return Promise.resolve(false);
    if (!this.refreshFlight) {
      const session = this.session;
      this.refreshFailedUnavailable.set(false);
      this.refreshFlight = this.requestToken('refresh', null, session)
        .catch((error: unknown) => {
          if (session === this.session && error instanceof HttpErrorResponse) {
            this.refreshFailedUnavailable.set(error.status === 0 || error.status >= 500);
          }
          return false;
        })
        .then((refreshed) => {
          if (!refreshed && session === this.session) this.clearSession();
          return refreshed;
        })
        .finally(() => {
          this.refreshFlight = undefined;
        });
    }
    return this.refreshFlight;
  }

  logout(): Promise<void> {
    if (!this.logoutFlight) {
      this.clearSession();
      // Deixa o refresh terminar antes de pedir a remoção do cookie que ele pode renovar.
      this.logoutFlight = this.finishLogout().finally(() => {
        this.logoutFlight = undefined;
      });
    }
    return this.logoutFlight;
  }

  clearSession(): void {
    this.session++;
    this.currentIdentity.set(null);
    this.token.set(null);
  }

  private async requestToken(
    action: 'login' | 'refresh',
    body: FormData | null,
    session: number,
  ): Promise<boolean> {
    const response = await firstValueFrom(
      this.http.post<TokenResponse>(`${this.config.oauthBaseUrl}/${action}`, body, {
        observe: 'response',
        withCredentials: true,
      }),
    );
    const token = response.body?.access_token;
    if (session !== this.session || response.status !== 201 || !token) return false;
    this.token.set(token);
    return true;
  }

  private async finishLogout(): Promise<void> {
    await this.refreshFlight;
    try {
      await firstValueFrom(
        this.http.post(`${this.config.oauthBaseUrl}/logout`, null, { withCredentials: true }),
      );
    } catch {
      // O estado local já foi encerrado.
    }
    await this.router.navigate(['/login']);
  }

  private invalid(): LoginError {
    return { kind: 'invalid', message: 'Não foi possível entrar. Verifique usuário e senha.' };
  }

  private unavailable(): LoginError {
    return { kind: 'unavailable', message: UNAVAILABLE_MESSAGE };
  }
}
