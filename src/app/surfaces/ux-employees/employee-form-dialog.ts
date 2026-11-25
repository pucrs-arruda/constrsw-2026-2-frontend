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
  type EmployeeRead,
  type EmployeeWrite,
} from './employees-api';

export interface EmployeeFormDialogData {
  mode: 'create' | 'edit';
  employee?: EmployeeRead;
}

export type EmployeeFormDialogResult = { id: string } | false;

function requiredTrimmed(control: AbstractControl): ValidationErrors | null {
  const value = String(control.value ?? '').trim();
  return value.length > 0 ? null : { required: true };
}

/** Optional email: empty/whitespace OK; otherwise light local@domain.tld pattern. */
function optionalEmail(control: AbstractControl): ValidationErrors | null {
  const value = String(control.value ?? '').trim();
  if (value.length === 0) {
    return null;
  }
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) ? null : { email: true };
}

@Component({
  selector: 'app-employee-form-dialog',
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
  templateUrl: './employee-form-dialog.html',
  styleUrl: './employee-form-dialog.scss',
})
export class EmployeeFormDialog {
  private readonly data = inject<EmployeeFormDialogData>(MAT_DIALOG_DATA);
  private readonly ref = inject(
    MatDialogRef<EmployeeFormDialog, EmployeeFormDialogResult>,
  );
  private readonly fb = inject(FormBuilder);
  private readonly employeesApi = inject(EmployeesApi);
  private readonly session = inject(AuthSession);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  readonly mode = this.data.mode;
  readonly dialogTitle =
    this.mode === 'create' ? 'Novo funcionário' : 'Editar funcionário';

  readonly saving = signal(false);
  readonly bannerKind = signal<AlertBannerKind | null>(null);
  readonly bannerMessage = signal('');

  readonly form = this.fb.group({
    registrationNumber: [
      this.data.employee?.registrationNumber ?? '',
      [requiredTrimmed],
    ],
    name: [this.data.employee?.name ?? '', [requiredTrimmed]],
    salary: this.fb.control<number | null>(
      this.data.employee?.salary ?? null,
      { validators: [Validators.required] },
    ),
    hireDate: [
      this.data.employee?.hireDate ?? '',
      [Validators.required, Validators.pattern(/^\d{4}-\d{2}-\d{2}$/)],
    ],
    position: [this.data.employee?.position ?? '', [requiredTrimmed]],
    status: [
      this.data.employee?.status ?? ('Active' as EmployeeWrite['status']),
      [Validators.required],
    ],
    phone: [this.data.employee?.phone ?? ''],
    email: [this.data.employee?.email ?? '', [optionalEmail]],
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

    if (this.mode === 'edit' && !this.data.employee?.id) {
      this.bannerKind.set('refusal');
      this.bannerMessage.set('Funcionário inválido para edição.');
      return;
    }

    const salaryRaw = this.form.controls.salary.value;
    const salary =
      typeof salaryRaw === 'number' ? salaryRaw : Number(salaryRaw);
    if (!Number.isFinite(salary)) {
      this.form.controls.salary.setErrors({ required: true });
      this.form.controls.salary.markAsTouched();
      return;
    }

    const status = this.form.controls.status.value;
    if (status !== 'Active' && status !== 'Inactive') {
      this.form.controls.status.setErrors({ required: true });
      this.form.controls.status.markAsTouched();
      return;
    }

    const phone = String(this.form.controls.phone.value ?? '').trim();
    const email = String(this.form.controls.email.value ?? '').trim();

    // Omit empty phone/email — OpenAPI treats omit/blank as absent; PUT omit clears.
    const body: EmployeeWrite = {
      registrationNumber: String(
        this.form.controls.registrationNumber.value ?? '',
      ).trim(),
      name: String(this.form.controls.name.value ?? '').trim(),
      salary,
      hireDate: String(this.form.controls.hireDate.value ?? ''),
      position: String(this.form.controls.position.value ?? '').trim(),
      status,
    };
    if (phone) {
      body.phone = phone;
    }
    if (email) {
      body.email = email;
    }

    this.saving.set(true);
    this.ref.disableClose = true;
    this.bannerKind.set(null);
    this.bannerMessage.set('');

    const request =
      this.mode === 'create'
        ? this.employeesApi.create(body)
        : this.employeesApi.replace(this.data.employee!.id, body);

    request.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (employee) => {
        this.saving.set(false);
        this.ref.disableClose = false;
        const id = String(
          this.mode === 'create'
            ? employee?.id
            : (this.data.employee?.id ?? employee?.id),
        ).trim();
        if (!id) {
          this.bannerKind.set('refusal');
          this.bannerMessage.set(
            'Resposta sem identificador do funcionário. Tente novamente.',
          );
          return;
        }
        this.ref.close({ id });
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
