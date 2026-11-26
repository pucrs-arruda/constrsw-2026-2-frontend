import { BreakpointObserver } from '@angular/cdk/layout';
import {
  Component,
  DestroyRef,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Observable } from 'rxjs';
import { BffRequestError, type AlertBannerKind } from '../../shared/http';
import {
  AlertBanner,
  EmptyState,
  SkeletonBlock,
  openEditDialog,
} from '../../shared/ui';
import { AuthSession } from '../../shell/auth-session';
import { IdentityApi } from '../../shell/identity-api';
import {
  OccurrenceFormDialog,
  type OccurrenceFormDialogData,
  type OccurrenceFormDialogResult,
} from './occurrence-form-dialog';
import {
  ResourceFormDialog,
  type ResourceFormDialogData,
  type ResourceFormDialogResult,
} from './resource-form-dialog';
import {
  FAIXA_START,
  OCCURRENCE_PRIORITY_LABELS,
  OCCURRENCE_STATUS_LABELS,
  OCCURRENCE_TYPE_LABELS,
  RESERVATION_STATUS_LABELS,
  activeReservationCount,
  faixaLabel,
  reservationDateLabel,
  resourceStatusLabel,
  resourceTypeLabel,
} from './resource-labels';
import {
  confirmOccurrenceDelete,
  confirmResourceDelete,
  deleteRefusalMessage,
  isUnauthorized,
} from './resource-delete';
import { hasResourceWriteRole } from './resource-permissions';
import {
  ResourcesApi,
  type FutureReservation,
  type Occurrence,
  type ResourceAggregateView,
} from './resources-api';

const DATE_FORMAT = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  timeZone: 'America/Sao_Paulo',
});

export function formatDate(iso: string | null | undefined): string {
  if (!iso) {
    return '';
  }
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? '' : DATE_FORMAT.format(date);
}

export interface OccurrenceItem {
  occurrence: Occurrence;
  title: string;
  meta: string;
  isOpen: boolean;
}

/** Open first, then newest first — what needs attention stays on top. */
function toOccurrenceItems(occurrences: readonly Occurrence[]): OccurrenceItem[] {
  return [...occurrences]
    .sort((a, b) => {
      if (a.status !== b.status) {
        return a.status === 'OPEN' ? -1 : 1;
      }
      return b.createdAt.localeCompare(a.createdAt);
    })
    .map((occurrence) => ({
      occurrence,
      // Figma 15: "Lâmpada fraca — ABERTA"
      title: `${occurrence.description} — ${OCCURRENCE_STATUS_LABELS[occurrence.status] ?? occurrence.status}`,
      meta: [
        OCCURRENCE_TYPE_LABELS[occurrence.type] ?? occurrence.type,
        `Prioridade ${(OCCURRENCE_PRIORITY_LABELS[occurrence.priority] ?? occurrence.priority).toLowerCase()}`,
        formatDate(occurrence.createdAt),
      ]
        .filter(Boolean)
        .join(' · '),
      isOpen: occurrence.status === 'OPEN',
    }));
}

export interface ReservationItem {
  reservation: FutureReservation;
  title: string;
  status: string;
  purpose: string;
  isCancelled: boolean;
}

/**
 * Read-only view of the BFF's T3 `reservations[]`: no join with lessons or
 * professors, only what the Reservation itself carries. Sorted by date + faixa
 * so the next booking is on top.
 */
function toReservationItems(
  reservations: readonly FutureReservation[],
): ReservationItem[] {
  const key = (r: FutureReservation) => `${r.data} ${FAIXA_START[r.faixaId] ?? '99:99'}`;
  return [...reservations]
    .sort((a, b) => key(a).localeCompare(key(b)))
    .map((reservation) => ({
      reservation,
      title: `${reservationDateLabel(reservation.data)} · ${faixaLabel(reservation.faixaId)}`,
      status: RESERVATION_STATUS_LABELS[reservation.status] ?? reservation.status,
      purpose: reservation.purpose ?? '',
      isCancelled: reservation.status === 'CANCELLED',
    }));
}

@Component({
  selector: 'app-resources-detail-page',
  standalone: true,
  imports: [
    MatButtonModule,
    MatIconModule,
    RouterLink,
    AlertBanner,
    EmptyState,
    SkeletonBlock,
  ],
  templateUrl: './resources-detail-page.html',
  styleUrl: './resources-detail-page.scss',
})
export class ResourcesDetailPage implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly resourcesApi = inject(ResourcesApi);
  private readonly identityApi = inject(IdentityApi);
  private readonly session = inject(AuthSession);
  private readonly dialog = inject(MatDialog);
  private readonly breakpoints = inject(BreakpointObserver);
  private readonly destroyRef = inject(DestroyRef);

  readonly resourceId = signal('');
  readonly resource = signal<ResourceAggregateView | null>(null);
  readonly loading = signal(true);
  readonly notFound = signal(false);
  readonly bannerKind = signal<AlertBannerKind | null>(null);
  readonly bannerMessage = signal('');
  /** UI hint only; the resources service still enforces WRITE_ROLES (403). */
  readonly canWrite = signal(false);
  readonly deleting = signal(false);

  readonly typeLabel = computed(() => {
    const resource = this.resource();
    return resource ? resourceTypeLabel(resource.type) : '';
  });
  readonly statusLabel = computed(() => {
    const resource = this.resource();
    return resource ? resourceStatusLabel(resource.active) : '';
  });
  readonly isInactive = computed(() => this.resource()?.active === false);
  readonly tagsDisplay = computed(() => {
    const tags = this.resource()?.tags ?? [];
    return tags.length > 0 ? tags.join(', ') : '—';
  });

  readonly reservationItems = computed(() =>
    toReservationItems(this.resource()?.reservations ?? []),
  );
  readonly activeReservations = computed(() =>
    activeReservationCount(this.resource()?.reservations),
  );

  readonly occurrenceItems = computed(() =>
    toOccurrenceItems(this.resource()?.occurrences ?? []),
  );
  readonly openOccurrenceCount = computed(() => {
    const resource = this.resource();
    if (!resource) {
      return 0;
    }
    return typeof resource.openOccurrenceCount === 'number'
      ? resource.openOccurrenceCount
      : (resource.occurrences ?? []).filter((o) => o.status === 'OPEN').length;
  });

  ngOnInit(): void {
    this.loadCanWrite();
    this.route.paramMap
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((params) => {
        const id = params.get('id') ?? '';
        this.resourceId.set(id);
        this.loadResource(id);
      });
  }

  onEditResource(): void {
    const resource = this.resource();
    if (!resource || !this.canWrite()) {
      return;
    }
    openEditDialog<
      ResourceFormDialog,
      ResourceFormDialogData,
      ResourceFormDialogResult
    >(this.dialog, ResourceFormDialog, this.breakpoints, {
      data: { mode: 'edit', resource },
    })
      .afterClosed()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((result) => {
        if (result && result.id) {
          this.loadResource(this.resourceId());
        }
      });
  }

  onRegisterOccurrence(): void {
    const resource = this.resource();
    if (!resource || !this.canWrite()) {
      return;
    }
    this.openOccurrenceDialog({
      mode: 'register',
      resourceId: resource.id,
      resourceName: resource.name,
    });
  }

  onResolveOccurrence(occurrence: Occurrence): void {
    const resource = this.resource();
    if (!resource || !this.canWrite() || occurrence.status !== 'OPEN') {
      return;
    }
    this.openOccurrenceDialog({
      mode: 'resolve',
      resourceId: resource.id,
      occurrence,
    });
  }

  onDeleteResource(): void {
    const resource = this.resource();
    if (!resource || !this.canWrite() || this.deleting()) {
      return;
    }
    confirmResourceDelete(this.dialog, this.breakpoints, resource.name)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((confirmed) => {
        if (!confirmed || this.deleting()) {
          return;
        }
        this.runDelete(this.resourcesApi.remove(resource.id), () => {
          void this.router.navigateByUrl('/recursos');
        });
      });
  }

  onDeleteOccurrence(occurrence: Occurrence): void {
    const resource = this.resource();
    if (!resource || !this.canWrite() || this.deleting()) {
      return;
    }
    confirmOccurrenceDelete(this.dialog, this.breakpoints, occurrence.description)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((confirmed) => {
        if (!confirmed || this.deleting()) {
          return;
        }
        this.runDelete(
          this.resourcesApi.removeOccurrence(resource.id, occurrence.id),
          () => this.loadResource(this.resourceId()),
        );
      });
  }

  /** 404 counts as done (already removed); other refusals keep the page and show the banner. */
  private runDelete(request: Observable<void>, done: () => void): void {
    this.deleting.set(true);
    this.bannerKind.set(null);
    this.bannerMessage.set('');
    request.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => {
        this.deleting.set(false);
        done();
      },
      error: (err: unknown) => {
        this.deleting.set(false);
        if (isUnauthorized(err)) {
          this.session.clear();
          void this.router.navigateByUrl('/login');
          return;
        }
        const message = deleteRefusalMessage(err);
        if (message === null) {
          done();
          return;
        }
        this.bannerKind.set('refusal');
        this.bannerMessage.set(message);
      },
    });
  }

  private openOccurrenceDialog(data: OccurrenceFormDialogData): void {
    openEditDialog<
      OccurrenceFormDialog,
      OccurrenceFormDialogData,
      OccurrenceFormDialogResult
    >(this.dialog, OccurrenceFormDialog, this.breakpoints, { data })
      .afterClosed()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((result) => {
        // Reload the aggregate so the list and openOccurrenceCount come from the BFF.
        if (result && result.id) {
          this.loadResource(this.resourceId());
        }
      });
  }

  private loadCanWrite(): void {
    this.identityApi
      .me()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (me) => this.canWrite.set(hasResourceWriteRole(me.papeis)),
        error: () => this.canWrite.set(false),
      });
  }

  private loadResource(id: string): void {
    this.loading.set(true);
    this.notFound.set(false);
    this.bannerKind.set(null);
    this.bannerMessage.set('');

    if (!id) {
      this.resource.set(null);
      this.loading.set(false);
      this.notFound.set(true);
      return;
    }

    this.resourcesApi
      .getById(id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (resource) => {
          this.resource.set(resource);
          this.loading.set(false);
        },
        error: (err: unknown) => {
          this.resource.set(null);
          this.loading.set(false);
          this.showLoadError(err);
        },
      });
  }

  private showLoadError(err: unknown): void {
    if (err instanceof BffRequestError) {
      if (err.mapped.kind === 'unauthorized' || err.mapped.status === 401) {
        this.session.clear();
        void this.router.navigateByUrl('/login');
        return;
      }
      if (err.mapped.status === 404) {
        this.notFound.set(true);
        return;
      }
      const kind = err.mapped.bannerKind;
      if (kind) {
        this.bannerKind.set(kind);
        this.bannerMessage.set(err.mapped.message);
        return;
      }
    }
    // No partial aggregate and no client-side join fallback (T3 whole-or-nothing).
    this.bannerKind.set('composition');
    this.bannerMessage.set('Serviço de composição indisponível.');
  }
}
