import { Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import {
  MAT_DIALOG_DATA,
  MatDialog,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { filter, finalize } from 'rxjs';
import type { ApiError } from '../data/api-error';
import { BreakpointObserver } from '@angular/cdk/layout';
import { AlertBanner, openConfirmDialog } from '../../../shared/ui';
import { RoomsApiService } from '../data/rooms-api.service';
import { featureCodePattern } from '../data/rooms.utils';
import type { AccessibilityFeature, FeaturePatch } from '../data/rooms.models';

export interface FeatureFormData {
  roomId: string;
  feature?: AccessibilityFeature;
}

@Component({
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSlideToggleModule,
    AlertBanner,
  ],
  template: `
    <h2 mat-dialog-title>{{ data.feature ? 'Editar recurso' : 'Adicionar recurso' }}</h2>
    <form [formGroup]="form" (ngSubmit)="save()">
      <mat-dialog-content>
        @if (error()) {
          <app-alert-banner kind="refusal" [message]="error()" />
        }
        <mat-form-field>
          <mat-label>Código</mat-label>
          <input matInput formControlName="code" maxlength="30" (input)="normalizeCode($event)" />
          <mat-hint>Ex.: RAMP, ELEVATOR, TACTILE_FLOOR</mat-hint>
          <mat-error
            >Informe de 1 a 30 caracteres. Comece com uma letra e use apenas letras maiúsculas,
            números e _.</mat-error
          >
        </mat-form-field>
        <mat-form-field>
          <mat-label>Descrição</mat-label>
          <textarea matInput formControlName="description" maxlength="255" rows="3"></textarea>
          <mat-hint align="end">{{ form.controls.description.value.length }}/255</mat-hint>
          <mat-error>Use até 255 caracteres.</mat-error>
        </mat-form-field>
        <mat-slide-toggle formControlName="present">Presente</mat-slide-toggle>
      </mat-dialog-content>
      <mat-dialog-actions align="end">
        <button mat-button type="button" [disabled]="saving()" (click)="cancel()">Cancelar</button>
        <button mat-flat-button type="submit" [disabled]="form.invalid || saving()">
          {{ saving() ? 'Salvando…' : data.feature ? 'Salvar alterações' : 'Criar recurso' }}
        </button>
      </mat-dialog-actions>
    </form>
  `,
  styles: `
    mat-form-field {
      display: block;
      margin-bottom: 12px;
    }
    @media (max-width: 599px) {
      :host {
        display: flex;
        flex-direction: column;
        height: 100%;
      }
      form {
        display: flex;
        flex-direction: column;
        flex: 1;
        min-height: 0;
      }
      mat-dialog-content {
        flex: 1;
        max-height: none;
      }
    }
  `,
})
export class FeatureFormDialog {
  protected readonly data = inject<FeatureFormData>(MAT_DIALOG_DATA);
  private readonly dialogRef = inject(MatDialogRef<FeatureFormDialog, AccessibilityFeature>);
  private readonly dialogs = inject(MatDialog);
  private readonly breakpoints = inject(BreakpointObserver);
  private readonly api = inject(RoomsApiService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly saving = signal(false);
  protected readonly error = signal('');
  private confirmingDiscard = false;
  protected readonly form = inject(FormBuilder).nonNullable.group({
    code: [
      this.data.feature?.code ?? '',
      [Validators.required, Validators.maxLength(30), Validators.pattern(featureCodePattern)],
    ],
    description: [this.data.feature?.description ?? '', Validators.maxLength(255)],
    present: [this.data.feature?.present ?? true],
  });

  constructor() {
    this.dialogRef
      .keydownEvents()
      .pipe(
        filter((event) => event.key === 'Escape' && !event.defaultPrevented),
        takeUntilDestroyed(),
      )
      .subscribe((event) => {
        event.preventDefault();
        this.cancel();
      });
    this.dialogRef
      .backdropClick()
      .pipe(takeUntilDestroyed())
      .subscribe(() => this.cancel());
  }

  protected normalizeCode(event: Event): void {
    const input = event.target as HTMLInputElement;
    const normalized = input.value.toUpperCase().replace(/\s/g, '_');
    if (normalized !== input.value) {
      const caret = input.selectionStart;
      input.value = normalized;
      input.setSelectionRange(caret, caret);
      this.form.controls.code.setValue(normalized);
    }
  }

  protected cancel(): void {
    if (this.saving() || this.confirmingDiscard) return;
    if (this.form.pristine) {
      this.dialogRef.close();
      return;
    }
    this.confirmingDiscard = true;
    openConfirmDialog(this.dialogs, {
      title: 'Descartar alterações?',
      message: 'As alterações feitas neste recurso serão perdidas.',
      confirmLabel: 'Descartar alterações',
    }, this.breakpoints)
      .afterClosed()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((confirmed) => {
        this.confirmingDiscard = false;
        if (confirmed) this.dialogRef.close();
      });
  }

  protected save(): void {
    if (this.form.invalid || this.saving()) return;
    const { code, description, present } = this.form.getRawValue();
    const cleanedDescription = description.trim() || null;
    const { feature, roomId } = this.data;
    const patch: FeaturePatch = {};
    if (feature) {
      if (code !== feature.code) patch.code = code;
      if (description !== (feature.description ?? '')) patch.description = cleanedDescription;
      if (present !== feature.present) patch.present = present;
      if (!Object.keys(patch).length) {
        this.dialogRef.close();
        return;
      }
    }

    this.saving.set(true);
    this.error.set('');
    this.form.disable();
    const request = feature
      ? this.api.patchFeature(roomId, feature.id, patch)
      : this.api.createFeature(roomId, {
          code,
          present,
          ...(cleanedDescription ? { description: cleanedDescription } : {}),
        });
    request
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => {
          this.saving.set(false);
          this.form.enable();
        }),
      )
      .subscribe({
        next: (saved) => this.dialogRef.close(saved),
        error: (error: ApiError) =>
          this.error.set(
            error.kind === 'forbidden'
              ? 'Você não tem permissão para esta ação.'
              : error.message || 'Não foi possível salvar o recurso.',
          ),
      });
  }
}
