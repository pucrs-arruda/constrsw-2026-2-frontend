import { DestroyRef, Component, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import {
  MAT_DIALOG_DATA,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { Router } from '@angular/router';
import { BffRequestError, type AlertBannerKind } from '../../shared/http';
import { AlertBanner, EditDialogLayout } from '../../shared/ui';
import { AuthSession } from '../../shell/auth-session';
import {
  EmployeesApi,
  type DependentRead,
  type DependentWrite,
} from './employees-api';

export interface DependentFormDialogData {
  mode: 'create' | 'edit';
  employeeId: string;
  dependent?: DependentRead;
}

function requiredTrimmed(control: AbstractControl): ValidationErrors | null {
  const value = String(control.value ?? '').trim();
  return value.length > 0 ? null : { required: true };
}

@Component({
  selector: 'app-dependent-form-dialog',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    AlertBanner,
    EditDialogLayout,
  ],
  templateUrl: './dependent-form-dialog.html',
  styleUrl: './dependent-form-dialog.scss',
})
export class DependentFormDialog {
  private readonly data = inject<DependentFormDialogData>(MAT_DIALOG_DATA);
  private readonly ref = inject(MatDialogRef<DependentFormDialog, boolean>);
  private readonly fb = inject(FormBuilder);
  private readonly employeesApi = inject(EmployeesApi);
  private readonly session = inject(AuthSession);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  readonly mode = this.data.mode;
  readonly dialogTitle =
    this.mode === 'create' ? 'Novo dependente' : 'Editar dependente';

  readonly saving = signal(false);
  readonly bannerKind = signal<AlertBannerKind | null>(null);
  readonly bannerMessage = signal('');

  readonly form = this.fb.nonNullable.group({
    name: [this.data.dependent?.name ?? '', [requiredTrimmed]],
    birthDate: [
      this.data.dependent?.birthDate ?? '',
      [Validators.required, Validators.pattern(/^\d{4}-\d{2}-\d{2}$/)],
    ],
    dependencyType: [
      this.data.dependent?.dependencyType ?? '',
      [requiredTrimmed],
    ],
    status: [
      this.data.dependent?.status ?? ('Active' as DependentWrite['status']),
      [Validators.required],
    ],
  });

  cancel(): void {
    if (this.saving()) {
      return;
    }
    this.ref.close(false);
  }

  save(): void {
    if (this.form.invalid || this.saving()) {
      this.form.markAllAsTouched();
      return;
    }

    if (this.mode === 'edit' && !this.data.dependent?.id) {
      this.bannerKind.set('refusal');
      this.bannerMessage.set('Dependente inválido para edição.');
      return;
    }

    if (!this.data.employeeId) {
      this.bannerKind.set('refusal');
      this.bannerMessage.set('Funcionário inválido para a operação.');
      return;
    }

    const body: DependentWrite = {
      name: this.form.controls.name.value.trim(),
      birthDate: this.form.controls.birthDate.value,
      dependencyType: this.form.controls.dependencyType.value.trim(),
      status: this.form.controls.status.value,
    };

    this.saving.set(true);
    this.ref.disableClose = true;
    this.bannerKind.set(null);
    this.bannerMessage.set('');

    const request =
      this.mode === 'create'
        ? this.employeesApi.createDependent(this.data.employeeId, body)
        : this.employeesApi.replaceDependent(
            this.data.employeeId,
            this.data.dependent!.id,
            body,
          );

    request.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => {
        this.saving.set(false);
        this.ref.disableClose = false;
        this.ref.close(true);
      },
      error: (err: unknown) => {
        this.saving.set(false);
        this.ref.disableClose = false;
        this.showWriteError(err);
      },
    });
  }

  private showWriteError(err: unknown): void {
    if (err instanceof BffRequestError) {
      if (err.mapped.kind === 'unauthorized' || err.mapped.status === 401) {
        this.session.clear();
        this.ref.close(false);
        void this.router.navigateByUrl('/login');
        return;
      }
      const kind = err.mapped.bannerKind;
      if (kind === 'composition' || kind === 'identity' || kind === 'refusal') {
        this.bannerKind.set(kind);
        // mapped.message already applies formatBffProblemMessage / refusalMessage.
        this.bannerMessage.set(err.mapped.message);
        return;
      }
    }
    this.bannerKind.set('refusal');
    this.bannerMessage.set('Não foi possível concluir a operação. Tente novamente.');
  }
}
