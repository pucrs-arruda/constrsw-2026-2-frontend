import { Injectable, signal, computed, Signal } from '@angular/core';
import { Identity } from './identity.model';

export interface LoginError {
  kind: 'invalid' | 'unavailable' | 'validation';
  message: string;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly _identity = signal<Identity | null>({
    sub: 'stub-admin-id',
    email: 'admin@pucrs.br',
    papeis: ['administrator'],
    employeeId: 'emp-01',
  });

  readonly identity: Signal<Identity | null> = this._identity.asReadonly();
  readonly isAuthenticated: Signal<boolean> = computed(() => this._identity() !== null);
  readonly isAdmin: Signal<boolean> = computed(() => this._identity()?.papeis.includes('administrator') ?? false);
  readonly seesAllClasses: Signal<boolean> = computed(() => {
    const papeis = this._identity()?.papeis ?? [];
    return papeis.includes('administrator') || papeis.includes('coordinator');
  });

  async login(username: string, password: string): Promise<void> {
    this._identity.set({
      sub: 'stub-user-id',
      email: username,
      papeis: ['administrator'],
    });
  }

  async logout(): Promise<void> {
    this._identity.set(null);
  }

  async loadIdentity(): Promise<Identity | null> {
    return this._identity();
  }

  async refresh(): Promise<boolean> {
    return true;
  }
}
