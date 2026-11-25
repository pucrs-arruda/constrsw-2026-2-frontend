import { BreakpointObserver } from '@angular/cdk/layout';
import { ComponentType } from '@angular/cdk/portal';
import { Component, input } from '@angular/core';
import {
  MatDialog,
  MatDialogConfig,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

const COMPACT_QUERY = '(max-width: 599.98px)';

export const EDIT_DIALOG_STANDARD_WIDTH = '560px';

/**
 * Layout shell for edit dialogs. Feature components compose this inside
 * their MatDialog content (content projection works in the feature template).
 *
 * Compact: pair with {@link openEditDialog} fullscreen panelClass + sticky footer.
 */
@Component({
  selector: 'app-edit-dialog-layout',
  standalone: true,
  imports: [MatDialogModule, MatButtonModule, MatIconModule],
  templateUrl: './edit-dialog.html',
  styleUrl: './edit-dialog.scss',
})
export class EditDialogLayout {
  /** Dialog heading (avoid native `title` attr collision). */
  readonly dialogTitle = input.required<string>();
  /** Accessible label for the close control (default Fechar). */
  readonly closeLabel = input('Fechar');
}

export interface OpenEditDialogOptions<D> extends MatDialogConfig<D> {
  /** Override compact detection when BreakpointObserver is unavailable. */
  forceCompact?: boolean;
}

/**
 * Opens a feature edit dialog with responsive sizing:
 * - compact (&lt;600): fullscreen + sticky footer panel class
 * - otherwise: ~560px modal
 */
export function openEditDialog<T, D = unknown, R = unknown>(
  dialog: MatDialog,
  component: ComponentType<T>,
  breakpoints: BreakpointObserver,
  config: OpenEditDialogOptions<D> = {},
): MatDialogRef<T, R> {
  const { forceCompact, panelClass, ...rest } = config;
  const compact =
    forceCompact ?? breakpoints.isMatched(COMPACT_QUERY);

  const classes = Array.isArray(panelClass)
    ? [...panelClass]
    : panelClass
      ? [panelClass]
      : [];

  classes.push('app-edit-dialog');
  if (compact) {
    classes.push('app-edit-dialog--fullscreen');
  } else {
    classes.push('app-edit-dialog--standard');
  }

  return dialog.open(component, {
    ...rest,
    panelClass: classes,
    width: compact ? '100vw' : EDIT_DIALOG_STANDARD_WIDTH,
    maxWidth: compact ? '100vw' : EDIT_DIALOG_STANDARD_WIDTH,
    height: compact ? '100dvh' : undefined,
    maxHeight: compact ? '100dvh' : '90vh',
    autoFocus: rest.autoFocus ?? 'dialog',
    restoreFocus: rest.restoreFocus ?? true,
  });
}

/** Builds MatDialogConfig only (when caller opens manually). */
export function editDialogConfig(
  breakpoints: BreakpointObserver,
  overrides: OpenEditDialogOptions<unknown> = {},
): MatDialogConfig {
  const { forceCompact, panelClass, ...rest } = overrides;
  const compact = forceCompact ?? breakpoints.isMatched(COMPACT_QUERY);
  const classes = Array.isArray(panelClass)
    ? [...panelClass]
    : panelClass
      ? [panelClass]
      : [];
  classes.push('app-edit-dialog');
  classes.push(compact ? 'app-edit-dialog--fullscreen' : 'app-edit-dialog--standard');

  return {
    ...rest,
    panelClass: classes,
    width: compact ? '100vw' : EDIT_DIALOG_STANDARD_WIDTH,
    maxWidth: compact ? '100vw' : EDIT_DIALOG_STANDARD_WIDTH,
    height: compact ? '100dvh' : undefined,
    maxHeight: compact ? '100dvh' : '90vh',
  };
}
