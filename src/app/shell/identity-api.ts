import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

/** BFF `GET /v1/identidade/me` body (Identity has no `nome`). */
export interface IdentityMe {
  sub: string;
  email?: string | null;
  papeis?: string[];
  employeeId?: string | null;
  professorId?: string | null;
  studentId?: string | null;
}

@Injectable({ providedIn: 'root' })
export class IdentityApi {
  private readonly http = inject(HttpClient);
  private readonly base = environment.bffBaseUrl.replace(/\/$/, '');

  me(): Observable<IdentityMe> {
    return this.http.get<IdentityMe>(`${this.base}/v1/identidade/me`);
  }
}

/** Initials for avatar: email local-part parts, else first two chars of `sub`. */
export function identityInitials(me: Pick<IdentityMe, 'sub' | 'email'>): string {
  const source = (me.email?.trim() || me.sub || '').trim();
  if (!source) {
    return '?';
  }
  const local = source.includes('@')
    ? source.slice(0, source.indexOf('@')).trim()
    : source;
  if (!local) {
    return '?';
  }
  const parts = local.split(/[.\-_+\s]+/).filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0]!.charAt(0) + parts[1]!.charAt(0)).toUpperCase();
  }
  return local.slice(0, 2).toUpperCase();
}

export function identityDisplayName(me: Pick<IdentityMe, 'sub' | 'email'>): string {
  const email = me.email?.trim();
  if (email) {
    return email;
  }
  return me.sub?.trim() || '';
}
