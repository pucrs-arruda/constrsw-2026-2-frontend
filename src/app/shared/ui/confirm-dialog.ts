import { BreakpointObserver } from '@angular/cdk/layout';
import { ComponentType } from '@angular/cdk/portal';
import {
  Component,
  inject,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import {
  MAT_DIALOG_DATA,
  MatDialog,
  MatDialogConfig,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { map } from 'rxjs';

const COMPACT_QUERY = '(max-width: 599.98px)';

export interface ConfirmDialogData {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
}

@Component({
  selector: 'app-confirm-dialog',
  standalone: true,
  imports: [MatDialogModule, MatButtonModule],
  templateUrl: './confirm-dialog.html',
  styleUrl: './confirm-dialog.scss',
})
export class ConfirmDialog {
  readonly data = inject<ConfirmDialogData>(MAT_DIALOG_DATA);
  private readonly dialogRef = inject(MatDialogRef<ConfirmDialog, boolean>);
  private readonly breakpoints = inject(BreakpointObserver);

  readonly isCompact = toSignal(
    this.breakpoints.observe(COMPACT_QUERY).pipe(map((r) => r.matches)),
    { initialValue: this.breakpoints.isMatched(COMPACT_QUERY) },
  );

  get confirmLabel(): string {
    return this.data.confirmLabel ?? 'Confirmar';
  }

  get cancelLabel(): string {
    return this.data.cancelLabel ?? 'Cancelar';
  }

  confirm(): void {
    this.dialogRef.close(true);
  }

  cancel(): void {
    this.dialogRef.close(false);
  }
}

/** Opens ConfirmDialog with compact-aware panel classes. */
export function openConfirmDialog(
  dialog: MatDialog,
  data: ConfirmDialogData,
  breakpoints?: BreakpointObserver,
): MatDialogRef<ConfirmDialog, boolean> {
  const compact =
    breakpoints?.isMatched(COMPACT_QUERY) ??
    (typeof window !== 'undefined' && window.matchMedia(COMPACT_QUERY).matches);

  const config: MatDialogConfig<ConfirmDialogData> = {
    data,
    autoFocus: 'dialog',
    restoreFocus: true,
    panelClass: compact
      ? ['app-confirm-dialog', 'app-confirm-dialog--compact']
      : ['app-confirm-dialog'],
    width: compact ? 'calc(100vw - 2rem)' : '400px',
    maxWidth: compact ? 'calc(100vw - 2rem)' : '400px',
  };

  return dialog.open(ConfirmDialog, config);
}

/** Re-export for feature stories that customize the component type. */
export type ConfirmDialogComponentType = ComponentType<ConfirmDialog>;
