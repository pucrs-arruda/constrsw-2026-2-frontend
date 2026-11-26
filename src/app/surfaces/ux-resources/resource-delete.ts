import { BreakpointObserver } from '@angular/cdk/layout';
import { MatDialog } from '@angular/material/dialog';
import { Observable } from 'rxjs';
import { BffRequestError } from '../../shared/http';
import { openConfirmDialog } from '../../shared/ui';

/**
 * Confirm before the logical delete (`enabled=false`). The service also hides
 * the resource's occurrences, so the message says so.
 */
export function confirmResourceDelete(
  dialog: MatDialog,
  breakpoints: BreakpointObserver,
  name: string,
): Observable<boolean | undefined> {
  return openConfirmDialog(
    dialog,
    {
      title: `Excluir ${name}?`,
      message: `${name} deixa de aparecer em Recursos, junto com as ocorrências dele. Reservas já feitas não são alteradas.`,
      confirmLabel: 'Excluir',
      cancelLabel: 'Cancelar',
    },
    breakpoints,
  ).afterClosed();
}

export function confirmOccurrenceDelete(
  dialog: MatDialog,
  breakpoints: BreakpointObserver,
  description: string,
): Observable<boolean | undefined> {
  return openConfirmDialog(
    dialog,
    {
      title: 'Excluir ocorrência?',
      message: `"${description}" deixa de aparecer nas ocorrências deste recurso.`,
      confirmLabel: 'Excluir',
      cancelLabel: 'Cancelar',
    },
    breakpoints,
  ).afterClosed();
}

/** pt-BR refusal for a failed DELETE; null means "already gone" (404). */
export function deleteRefusalMessage(err: unknown): string | null {
  if (err instanceof BffRequestError) {
    if (err.mapped.status === 404) {
      return null;
    }
    if (err.mapped.status === 403) {
      return 'Você não tem permissão para excluir.';
    }
    if (err.mapped.bannerKind === 'composition') {
      return err.mapped.message;
    }
    return err.mapped.message || 'Não foi possível excluir. Tente novamente.';
  }
  return 'Não foi possível excluir. Tente novamente.';
}

export function isUnauthorized(err: unknown): boolean {
  return (
    err instanceof BffRequestError &&
    (err.mapped.kind === 'unauthorized' || err.mapped.status === 401)
  );
}
