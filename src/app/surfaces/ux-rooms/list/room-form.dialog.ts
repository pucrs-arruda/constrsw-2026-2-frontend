import { BreakpointObserver } from '@angular/cdk/layout';
import { Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AbstractControl, FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatChipInputEvent, MatChipsModule } from '@angular/material/chips';
import { MAT_DIALOG_DATA, MatDialog, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { finalize } from 'rxjs';
import { ApiError } from '../../../shared/http/api-error';
import { ConfirmDialogComponent, RefusalBannerComponent } from '../../../shared/ui';
import { RoomsApiService } from '../data/rooms-api.service';
import { Room, RoomPatch, RoomUpdate } from '../data/rooms.models';

export type RoomFormDialogData = { mode: 'create' } | { mode: 'edit'; room: Room };

const uuid = /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i;
const requiredText = (control: AbstractControl<string>) =>
  control.value.trim() ? null : { required: true };
const validCapacity = (control: AbstractControl<number | null>) =>
  control.value !== null && Number.isInteger(control.value) && control.value >= 1
    ? null
    : { capacity: true };

@Component({
  selector: 'app-room-form-dialog',
  imports: [
    ReactiveFormsModule, MatButtonModule, MatChipsModule, MatDialogModule,
    MatFormFieldModule, MatInputModule, MatProgressSpinnerModule, MatSlideToggleModule,
    RefusalBannerComponent,
  ],
  templateUrl: './room-form.dialog.html',
  styleUrl: './room-form.dialog.scss',
})
export class RoomFormDialog {
  static open(dialog: MatDialog, data: RoomFormDialogData) {
    return dialog.open<RoomFormDialog, RoomFormDialogData, Room>(RoomFormDialog, {
      data,
      width: '560px',
      maxWidth: '100vw',
      maxHeight: '100dvh',
      panelClass: 'room-form-panel',
      disableClose: true,
    });
  }

  private readonly dialog = inject(MatDialog);
  private readonly ref = inject<MatDialogRef<RoomFormDialog, Room>>(MatDialogRef);
  private readonly api = inject(RoomsApiService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly builder = inject(FormBuilder);
  readonly data = inject<RoomFormDialogData>(MAT_DIALOG_DATA);
  private readonly room = this.data.mode === 'edit' ? this.data.room : undefined;

  readonly form = this.builder.group({
    code: this.builder.nonNullable.control(this.room?.code ?? '', [requiredText, Validators.maxLength(20)]),
    name: this.builder.nonNullable.control(this.room?.name ?? '', [requiredText, Validators.maxLength(100)]),
    building: this.builder.nonNullable.control(this.room?.building ?? '', [requiredText, Validators.maxLength(50)]),
    capacity: this.builder.control<number | null>(this.room?.capacity ?? null, validCapacity),
    active: this.builder.nonNullable.control(this.room?.active ?? true),
  });
  readonly resources = signal(this.room?.resourceIds ?? []);
  readonly resourceDraft = this.builder.nonNullable.control('');
  readonly saving = signal(false);
  readonly error = signal('');
  private confirming = false;

  constructor() {
    this.ref.disableClose = true;
    inject(BreakpointObserver).observe('(max-width: 599px)')
      .pipe(takeUntilDestroyed()).subscribe(({ matches }) => {
        this.ref.updateSize(matches ? '100vw' : '560px', matches ? '100dvh' : '');
      });
    this.ref.keydownEvents().pipe(takeUntilDestroyed()).subscribe(event => {
      if (event.key === 'Escape') {
        event.preventDefault();
        this.cancel();
      }
    });
    this.ref.backdropClick().pipe(takeUntilDestroyed()).subscribe(() => this.cancel());
  }

  addResource(event: MatChipInputEvent): void {
    const value = event.value.trim();
    if (!value || !uuid.test(value)) return;
    const normalized = value.toLowerCase();
    if (!this.resources().some(id => id.toLowerCase() === normalized)) {
      this.resources.update(ids => [...ids, normalized]);
    }
    this.resourceDraft.reset();
  }

  removeResource(id: string): void {
    this.resources.update(ids => ids.filter(value => value !== id));
  }

  validResourceDraft(): boolean {
    return uuid.test(this.resourceDraft.value.trim());
  }

  hasChanges(): boolean {
    return Object.keys(this.changes()).length > 0;
  }

  private values(): RoomUpdate {
    const { code, name, building, capacity, active } = this.form.getRawValue();
    return { code: code.trim(), name: name.trim(), building: building.trim(), capacity, active, resourceIds: this.resources() };
  }

  changes(): RoomPatch {
    const values = this.values();
    const room = this.room;
    if (!room) return values;
    const patch: RoomPatch = {};
    if (values.code !== room.code) patch.code = values.code;
    if (values.name !== room.name) patch.name = values.name;
    if (values.building !== room.building) patch.building = values.building;
    if (values.capacity !== room.capacity) patch.capacity = values.capacity;
    if (values.active !== room.active) patch.active = values.active;
    const original = new Set(room.resourceIds);
    if (values.resourceIds.length !== original.size || values.resourceIds.some(id => !original.has(id))) {
      patch.resourceIds = values.resourceIds;
    }
    return patch;
  }

  cancel(): void {
    if (this.saving() || this.confirming) return;
    const dirty = this.form.dirty || this.resourceDraft.dirty ||
      (this.room ? Object.keys(this.changes()).length > 0 : this.resources().length > 0);
    if (!dirty) {
      this.ref.close();
      return;
    }
    this.confirming = true;
    this.dialog.open(ConfirmDialogComponent, {
      width: '400px',
      data: {
        title: 'Descartar alterações?',
        message: 'As alterações feitas nesta sala serão perdidas.',
        confirmLabel: 'Descartar alterações',
        cancelLabel: 'Continuar editando',
        destructive: true,
      },
    }).afterClosed().pipe(takeUntilDestroyed(this.destroyRef)).subscribe(confirmed => {
      this.confirming = false;
      if (confirmed) this.ref.close();
    });
  }

  save(): void {
    if (this.saving() || this.form.invalid || this.resourceDraft.value.trim()) return;
    const patch = this.changes();
    if (this.room && Object.keys(patch).length === 0) return;
    const request = this.room ? this.api.patch(this.room.id, patch) : this.api.create(this.values());
    this.saving.set(true);
    this.error.set('');
    this.form.disable();
    this.resourceDraft.disable();
    request.pipe(
      takeUntilDestroyed(this.destroyRef),
      finalize(() => {
        this.saving.set(false);
        this.form.enable();
        this.resourceDraft.enable();
      }),
    ).subscribe({
      next: room => this.ref.close(room),
      error: (error: ApiError) => this.error.set(error.kind === 'forbidden'
        ? 'Você não tem permissão para esta ação.'
        : error.message || 'Não foi possível salvar a sala.'),
    });
  }
}
