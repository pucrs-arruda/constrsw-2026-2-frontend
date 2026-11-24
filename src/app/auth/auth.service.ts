import { Injectable, signal, computed, Signal } from '@angular/core';
import { Identity } from './identity.model';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly _identity = signal<Identity | null>({
    sub: '00000000-0000-0000-0000-000000000001',
    email: 'admin@pucrs.br',
    papeis: ['administrator'],
    employeeId: null,
    professorId: null,
    studentId: null,
  });

  readonly identity: Signal<Identity | null> = this._identity.asReadonly();
  readonly isAuthenticated: Signal<boolean> = computed(() => this._identity() !== null);
  readonly isAdmin: Signal<boolean> = computed(() => this._identity()?.papeis.includes('administrator') ?? false);
  readonly seesAllClasses: Signal<boolean> = computed(() => {
    const papeis = this._identity()?.papeis ?? [];
    return papeis.includes('administrator') || papeis.includes('coordinator');
  });

  async login(username: string, password: string): Promise<void> {
    // Stub AG-04: implementação real é do AG-05
    this._identity.set({
      sub: '00000000-0000-0000-0000-000000000001',
      email: username || 'admin@pucrs.br',
      papeis: ['administrator'],
    });
  }

  async logout(): Promise<void> {
    // Stub AG-04: implementação real é do AG-05
    this._identity.set(null);
  }

  async loadIdentity(): Promise<Identity | null> {
    // Stub AG-04: implementação real é do AG-05
    return this._identity();
  }

  async refresh(): Promise<boolean> {
    // Stub AG-04: implementação real é do AG-05
    return true;
  }
}
