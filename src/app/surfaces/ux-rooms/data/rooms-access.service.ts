import { Injectable, Signal, computed, inject, signal } from '@angular/core';
import { catchError, of, tap } from 'rxjs';

import { IdentityApi } from '../../../shell/identity-api';

/**
 * Papéis de quem está vendo a superfície de salas.
 *
 * Existe aqui, e não no shell, porque o shell é do Prof. Arruda: `spec-frontend/contribution.md`
 * pede alinhamento para mexer nele, e esta é uma necessidade só da UX-ROOMS. O que se consome do
 * shell é a API pública `IdentityApi`, que já fala com `GET /v1/identidade/me` pelo BFF.
 *
 * **Isto não é controle de acesso.** Quem recusa a escrita é o domínio (403), e o AD-6 proíbe o
 * proxy de pré-validar regra de negócio. O papel aqui serve só para não oferecer um botão que o
 * servidor vai negar — a recusa, se vier, aparece no `app-refusal-banner`.
 */
@Injectable({ providedIn: 'root' })
export class RoomsAccess {
  private readonly identity = inject(IdentityApi);
  private readonly papeis = signal<readonly string[]>([]);

  /** Quem escreve Room e AccessibilityFeature (`domain-pairs.md`, mapa de escrita por papel). */
  readonly canWrite: Signal<boolean> = computed(() => this.papeis().includes('administrator'));

  /**
   * Administrador e coordenador enxergam todas as turmas; professor e aluno recebem do serviço
   * `classes` só as próprias. Uma sala pode então aparecer com menos turmas do que tem, e a tela
   * avisa em vez de deixar o número mentir.
   */
  readonly seesAllClasses: Signal<boolean> = computed(
    () => this.papeis().includes('administrator') || this.papeis().includes('coordinator'),
  );

  constructor() {
    this.load();
  }

  /**
   * Identidade indisponível não quebra a superfície: sem papéis conhecidos, a tela fica em modo
   * leitura. É o fallback seguro — melhor esconder um botão de quem podia usá-lo do que oferecer
   * escrita a quem vai tomar 403.
   */
  private load(): void {
    this.identity
      .me()
      .pipe(
        tap((me) => this.papeis.set(me.papeis ?? [])),
        catchError(() => {
          this.papeis.set([]);
          return of(null);
        }),
      )
      .subscribe();
  }
}
