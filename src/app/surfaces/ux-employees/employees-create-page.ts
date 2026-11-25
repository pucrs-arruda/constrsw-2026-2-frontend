import { BreakpointObserver } from '@angular/cdk/layout';
import { Component, DestroyRef, OnInit, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatDialog } from '@angular/material/dialog';
import { Router } from '@angular/router';
import { openEditDialog } from '../../shared/ui';
import { AuthSession } from '../../shell/auth-session';
import { IdentityApi } from '../../shell/identity-api';
import {
  EmployeeFormDialog,
  type EmployeeFormDialogData,
  type EmployeeFormDialogResult,
} from './employee-form-dialog';

@Component({
  selector: 'app-employees-create-page',
  standalone: true,
  templateUrl: './employees-create-page.html',
  styleUrl: './employees-create-page.scss',
})
export class EmployeesCreatePage implements OnInit {
  private readonly dialog = inject(MatDialog);
  private readonly breakpoints = inject(BreakpointObserver);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly identityApi = inject(IdentityApi);
  private readonly session = inject(AuthSession);

  ngOnInit(): void {
    this.identityApi
      .me()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (me) => {
          if (!(me.papeis ?? []).includes('funcionario')) {
            void this.router.navigateByUrl('/funcionarios');
            return;
          }
          this.openCreateDialog();
        },
        error: () => {
          void this.router.navigateByUrl('/funcionarios');
        },
      });
  }

  private openCreateDialog(): void {
    openEditDialog<
      EmployeeFormDialog,
      EmployeeFormDialogData,
      EmployeeFormDialogResult
    >(this.dialog, EmployeeFormDialog, this.breakpoints, {
      data: { mode: 'create' },
    })
      .afterClosed()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((result) => {
        const id =
          result && typeof result === 'object' && typeof result.id === 'string'
            ? result.id.trim()
            : '';
        if (id) {
          void this.router.navigateByUrl(
            `/funcionarios/${encodeURIComponent(id)}`,
          );
          return;
        }
        // 401 already cleared session and navigated to login — do not race to list.
        if (!this.session.isAuthenticated) {
          return;
        }
        void this.router.navigateByUrl('/funcionarios');
      });
  }
}
