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
import { BffRequestError, type AlertBannerKind } from '../../shared/http';
import { AlertBanner, EditDialogLayout } from '../../shared/ui';
import { AuthSession } from '../../shell/auth-session';
import { RESOURCE_TYPE_LABELS } from './resource-labels';
import {
  ResourcesApi,
  type ResourceCreate,
  type ResourcePatch,
  type ResourceType,
  type ResourceView,
} from './resources-api';

export interface ResourceFormDialogData {
  mode: 'create' | 'edit';
  resource?: Pick<ResourceView, 'id' | 'code' | 'name' | 'type' | 'active' | 'tags'>;
}

export type ResourceFormDialogResult = { id: string } | false;

const CODE_PATTERN = /^[A-Za-z0-9]+(-[A-Za-z0-9]+)*$/;
const TAG_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const MAX_TAGS = 10;
const MAX_TAG_LENGTH = 30;

function requiredTrimmed(control: AbstractControl): ValidationErrors | null {
  return String(control.value ?? '').trim().length > 0 ? null : { required: true };
}

/** Same rules as ResourceCreate.code, checked on the trimmed value we actually send. */
function validCode(control: AbstractControl): ValidationErrors | null {
  const value = String(control.value ?? '').trim();
  if (value.length === 0) {
    return { required: true };
  }
  if (value.length < 3 || value.length > 32 || !CODE_PATTERN.test(value)) {
    return { pattern: true };
  }
  return null;
}

/** "av, sala-2" → ["av", "sala-2"]; lowercases, drops blanks and duplicates. */
export function parseTags(raw: string): string[] {
  const tags = String(raw ?? '')
    .split(',')
    .map((tag) => tag.trim().toLowerCase())
    .filter((tag) => tag.length > 0);
  return Array.from(new Set(tags));
}

function validTags(control: AbstractControl): ValidationErrors | null {
  const tags = parseTags(String(control.value ?? ''));
  if (tags.length > MAX_TAGS) {
    return { tooMany: true };
  }
  const bad = tags.some(
    (tag) => tag.length > MAX_TAG_LENGTH || !TAG_PATTERN.test(tag),
  );
  return bad ? { pattern: true } : null;
}

function sameTags(a: readonly string[], b: readonly string[]): boolean {
  return a.length === b.length && a.every((tag, i) => tag === b[i]);
}

@Component({
  selector: 'app-resource-form-dialog',
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
  templateUrl: './resource-form-dialog.html',
  styleUrl: './resource-form-dialog.scss',
})
export class ResourceFormDialog {
  private readonly data = inject<ResourceFormDialogData>(MAT_DIALOG_DATA);
  private readonly ref = inject(
    MatDialogRef<ResourceFormDialog, ResourceFormDialogResult>,
  );
  private readonly fb = inject(FormBuilder);
  private readonly resourcesApi = inject(ResourcesApi);
  private readonly session = inject(AuthSession);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  readonly mode = this.data.mode;
  readonly dialogTitle =
    this.mode === 'create' ? 'Novo recurso' : 'Editar recurso';
  readonly typeOptions = Object.entries(RESOURCE_TYPE_LABELS).map(
    ([value, label]) => ({ value: value as ResourceType, label }),
  );

  readonly saving = signal(false);
  readonly bannerKind = signal<AlertBannerKind | null>(null);
  readonly bannerMessage = signal('');

  private readonly original = this.data.resource;

  readonly form = this.fb.group({
    code: this.fb.control(
      { value: this.original?.code ?? '', disabled: this.mode === 'edit' },
      { validators: [validCode] },
    ),
    name: [
      this.original?.name ?? '',
      [requiredTrimmed, Validators.maxLength(120)],
    ],
    type: this.fb.control<ResourceType | null>(this.original?.type ?? null, {
      validators: [Validators.required],
    }),
    active: this.fb.control<boolean>(this.original?.active ?? true, {
      nonNullable: true,
    }),
    tags: [(this.original?.tags ?? []).join(', '), [validTags]],
  });

  cancel(): void {
    if (!this.saving()) {
      this.ref.close(false);
    }
  }

  save(): void {
    if (this.form.invalid || this.saving()) {
      this.form.markAllAsTouched();
      return;
    }

    const name = String(this.form.controls.name.value ?? '').trim();
    const type = this.form.controls.type.value as ResourceType;
    const active = this.form.controls.active.value;
    const tags = parseTags(String(this.form.controls.tags.value ?? ''));

    let request;
    if (this.mode === 'create') {
      const body: ResourceCreate = {
        code: String(this.form.controls.code.value ?? '').trim().toUpperCase(),
        name,
        type,
        active,
        tags,
      };
      request = this.resourcesApi.create(body);
    } else {
      const original = this.original;
      if (!original?.id) {
        this.showRefusal('Recurso inválido para edição.');
        return;
      }
      const body: ResourcePatch = {};
      if (name !== original.name) body.name = name;
      if (type !== original.type) body.type = type;
      if (active !== original.active) body.active = active;
      if (!sameTags(tags, original.tags ?? [])) body.tags = tags;
      // ResourcePatch has minProperties 1: nothing changed means nothing to send.
      if (Object.keys(body).length === 0) {
        this.ref.close({ id: original.id });
        return;
      }
      request = this.resourcesApi.patch(original.id, body);
    }

    this.saving.set(true);
    this.ref.disableClose = true;
    this.bannerKind.set(null);
    this.bannerMessage.set('');

    request.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (resource) => {
        this.saving.set(false);
        this.ref.disableClose = false;
        const id = String(resource?.id ?? this.original?.id ?? '').trim();
        if (!id) {
          this.showRefusal('Resposta sem identificador do recurso. Tente novamente.');
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

  private showRefusal(message: string): void {
    this.bannerKind.set('refusal');
    this.bannerMessage.set(message);
  }

  private showWriteError(err: unknown): void {
    if (err instanceof BffRequestError) {
      if (err.mapped.kind === 'unauthorized' || err.mapped.status === 401) {
        this.session.clear();
        this.ref.close(false);
        void this.router.navigateByUrl('/login');
        return;
      }
      if (err.mapped.status === 409) {
        this.showRefusal('Já existe um recurso com este código.');
        return;
      }
      if (err.mapped.status === 403) {
        this.showRefusal('Você não tem permissão para alterar recursos.');
        return;
      }
      const kind = err.mapped.bannerKind;
      if (kind) {
        this.bannerKind.set(kind);
        this.bannerMessage.set(err.mapped.message);
        return;
      }
    }
    this.showRefusal('Não foi possível concluir a operação. Tente novamente.');
  }
}
