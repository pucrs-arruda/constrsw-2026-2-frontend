import { Component, DestroyRef, inject, signal } from '@angular/core';
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
import { Observable } from 'rxjs';
import { BffRequestError, type AlertBannerKind } from '../../shared/http';
import { AlertBanner, EditDialogLayout } from '../../shared/ui';
import { AuthSession } from '../../shell/auth-session';
import {
  OCCURRENCE_PRIORITY_LABELS,
  OCCURRENCE_TYPE_LABELS,
} from './resource-labels';
import {
  ResourcesApi,
  type Occurrence,
  type OccurrencePriority,
  type OccurrenceType,
} from './resources-api';

/**
 * - `register`: new occurrence (description, type, priority) on the resource.
 * - `resolve`: closes an OPEN occurrence; the service resolves it when `resolution` is sent.
 */
export type OccurrenceFormDialogData =
  | { mode: 'register'; resourceId: string; resourceName: string }
  | { mode: 'resolve'; resourceId: string; occurrence: Occurrence };

export type OccurrenceFormDialogResult = { id: string } | false;

function requiredTrimmed(control: AbstractControl): ValidationErrors | null {
  return String(control.value ?? '').trim().length > 0 ? null : { required: true };
}

@Component({
  selector: 'app-occurrence-form-dialog',
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
  templateUrl: './occurrence-form-dialog.html',
  styleUrl: './occurrence-form-dialog.scss',
})
export class OccurrenceFormDialog {
  readonly data = inject<OccurrenceFormDialogData>(MAT_DIALOG_DATA);
  private readonly ref = inject(
    MatDialogRef<OccurrenceFormDialog, OccurrenceFormDialogResult>,
  );
  private readonly fb = inject(FormBuilder);
  private readonly resourcesApi = inject(ResourcesApi);
  private readonly session = inject(AuthSession);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  readonly mode = this.data.mode;
  readonly dialogTitle =
    this.mode === 'register' ? 'Registrar ocorrência' : 'Resolver ocorrência';
  readonly typeOptions = Object.entries(OCCURRENCE_TYPE_LABELS).map(
    ([value, label]) => ({ value: value as OccurrenceType, label }),
  );
  readonly priorityOptions = Object.entries(OCCURRENCE_PRIORITY_LABELS).map(
    ([value, label]) => ({ value: value as OccurrencePriority, label }),
  );

  readonly saving = signal(false);
  readonly bannerKind = signal<AlertBannerKind | null>(null);
  readonly bannerMessage = signal('');

  readonly registerForm = this.fb.group({
    description: ['', [requiredTrimmed]],
    type: this.fb.control<OccurrenceType | null>(null, {
      validators: [Validators.required],
    }),
    priority: this.fb.control<OccurrencePriority>('MEDIUM', {
      nonNullable: true,
    }),
  });

  readonly resolveForm = this.fb.group({
    resolution: ['', [requiredTrimmed]],
  });

  /** Occurrence being resolved (resolve mode only), for the read-only summary. */
  readonly occurrence =
    this.data.mode === 'resolve' ? this.data.occurrence : null;

  typeLabel(type: OccurrenceType): string {
    return OCCURRENCE_TYPE_LABELS[type] ?? type;
  }

  priorityLabel(priority: OccurrencePriority): string {
    return OCCURRENCE_PRIORITY_LABELS[priority] ?? priority;
  }

  cancel(): void {
    if (!this.saving()) {
      this.ref.close(false);
    }
  }

  save(): void {
    if (this.saving()) {
      return;
    }

    let request: Observable<Occurrence>;
    if (this.data.mode === 'register') {
      if (this.registerForm.invalid) {
        this.registerForm.markAllAsTouched();
        return;
      }
      const value = this.registerForm.getRawValue();
      request = this.resourcesApi.createOccurrence(this.data.resourceId, {
        description: String(value.description ?? '').trim(),
        type: value.type as OccurrenceType,
        priority: value.priority,
      });
    } else {
      if (this.resolveForm.invalid) {
        this.resolveForm.markAllAsTouched();
        return;
      }
      request = this.resourcesApi.resolveOccurrence(
        this.data.resourceId,
        this.data.occurrence.id,
        String(this.resolveForm.controls.resolution.value ?? '').trim(),
      );
    }

    this.saving.set(true);
    this.ref.disableClose = true;
    this.bannerKind.set(null);
    this.bannerMessage.set('');

    request.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (occurrence) => {
        this.saving.set(false);
        this.ref.disableClose = false;
        const fallback =
          this.data.mode === 'resolve' ? this.data.occurrence.id : '';
        this.ref.close({ id: String(occurrence?.id ?? fallback) });
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
      if (err.mapped.status === 403) {
        this.bannerKind.set('refusal');
        this.bannerMessage.set('Você não tem permissão para alterar ocorrências.');
        return;
      }
      if (err.mapped.status === 409) {
        this.bannerKind.set('refusal');
        this.bannerMessage.set('Esta ocorrência já foi resolvida.');
        return;
      }
      const kind = err.mapped.bannerKind;
      if (kind) {
        this.bannerKind.set(kind);
        this.bannerMessage.set(err.mapped.message);
        return;
      }
    }
    this.bannerKind.set('refusal');
    this.bannerMessage.set('Não foi possível concluir a operação. Tente novamente.');
  }
}
