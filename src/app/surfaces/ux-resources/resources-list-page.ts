import {
  Component,
  DestroyRef,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { BreakpointObserver } from '@angular/cdk/layout';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { Router } from '@angular/router';
import { BffRequestError, type AlertBannerKind } from '../../shared/http';
import {
  AlertBanner,
  EmptyState,
  ResponsiveDataTable,
  SkeletonBlock,
  openEditDialog,
  type DataTableColumn,
  type DataTableRow,
} from '../../shared/ui';
import { AuthSession } from '../../shell/auth-session';
import { IdentityApi } from '../../shell/identity-api';
import {
  ResourceFormDialog,
  type ResourceFormDialogData,
  type ResourceFormDialogResult,
} from './resource-form-dialog';
import {
  activeReservationCount,
  resourceStatusLabel,
  resourceTypeLabel,
} from './resource-labels';
import { hasResourceWriteRole } from './resource-permissions';
import { ResourcesApi, type ResourceView } from './resources-api';

/**
 * Figma 14 order is Nome · Tipo · Status · Reservas futuras. Status is the 2nd
 * high-priority column so the compact 2-line list surfaces "Inativo" under the name.
 */
const RESOURCE_COLUMNS: readonly DataTableColumn[] = [
  { key: 'name', header: 'Nome', priority: 'high' },
  { key: 'statusLabel', header: 'Status', priority: 'high' },
  { key: 'typeLabel', header: 'Tipo', priority: 'high' },
  { key: 'futureReservations', header: 'Reservas futuras', priority: 'high' },
  { key: 'code', header: 'Código', priority: 'low' },
];

function toRow(resource: ResourceView): DataTableRow {
  return {
    id: resource.id,
    name: resource.name,
    code: resource.code,
    typeLabel: resourceTypeLabel(resource.type),
    statusLabel: resourceStatusLabel(resource.active),
    futureReservations: String(activeReservationCount(resource.reservations)),
  };
}

function matchesSearch(resource: ResourceView, query: string): boolean {
  const haystacks = [
    resource.name,
    resource.code,
    resourceTypeLabel(resource.type),
    ...(resource.tags ?? []),
  ];
  return haystacks.some((value) => value.toLowerCase().includes(query));
}

@Component({
  selector: 'app-resources-list-page',
  standalone: true,
  imports: [
    FormsModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    AlertBanner,
    EmptyState,
    ResponsiveDataTable,
    SkeletonBlock,
  ],
  templateUrl: './resources-list-page.html',
  styleUrl: './resources-list-page.scss',
})
export class ResourcesListPage implements OnInit {
  private readonly resourcesApi = inject(ResourcesApi);
  private readonly identityApi = inject(IdentityApi);
  private readonly session = inject(AuthSession);
  private readonly router = inject(Router);
  private readonly dialog = inject(MatDialog);
  private readonly breakpoints = inject(BreakpointObserver);
  private readonly destroyRef = inject(DestroyRef);

  readonly columns = RESOURCE_COLUMNS;

  readonly loading = signal(true);
  readonly resources = signal<ResourceView[]>([]);
  readonly searchQuery = signal('');
  readonly bannerKind = signal<AlertBannerKind | null>(null);
  readonly bannerMessage = signal('');
  /** UI hint only; the resources service still enforces WRITE_ROLES (403). */
  readonly canWrite = signal(false);

  readonly filteredRows = computed(() => {
    const query = this.searchQuery().trim().toLowerCase();
    const list = this.resources();
    const filtered = query
      ? list.filter((resource) => matchesSearch(resource, query))
      : list;
    return filtered.map(toRow);
  });

  readonly showEmpty = computed(
    () => !this.loading() && !this.bannerKind() && this.resources().length === 0,
  );

  readonly showNoSearchResults = computed(
    () =>
      !this.loading() &&
      !this.bannerKind() &&
      this.resources().length > 0 &&
      this.filteredRows().length === 0,
  );

  readonly showTable = computed(
    () =>
      !this.loading() && !this.bannerKind() && this.filteredRows().length > 0,
  );

  ngOnInit(): void {
    this.loadCanWrite();
    this.loadResources();
  }

  onSearchInput(value: string): void {
    this.searchQuery.set(value);
  }

  onCreate(): void {
    this.openForm({ mode: 'create' });
  }

  onEditRow(row: DataTableRow): void {
    const resource = this.resources().find((item) => item.id === row.id);
    if (resource) {
      this.openForm({ mode: 'edit', resource });
    }
  }

  private openForm(data: ResourceFormDialogData): void {
    if (!this.canWrite()) {
      return;
    }
    openEditDialog<
      ResourceFormDialog,
      ResourceFormDialogData,
      ResourceFormDialogResult
    >(this.dialog, ResourceFormDialog, this.breakpoints, { data })
      .afterClosed()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((result) => {
        if (result && result.id) {
          this.loadResources();
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

  onOpenRow(row: DataTableRow): void {
    const id = row.id;
    if (id == null || id === '') {
      return;
    }
    void this.router.navigate(['/recursos', String(id)]);
  }

  private loadResources(): void {
    this.loading.set(true);
    this.bannerKind.set(null);
    this.bannerMessage.set('');

    this.resourcesApi
      .list()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (list) => {
          this.resources.set(Array.isArray(list) ? list : []);
          this.loading.set(false);
        },
        error: (err: unknown) => {
          this.resources.set([]);
          this.loading.set(false);
          this.showListError(err);
        },
      });
  }

  private showListError(err: unknown): void {
    if (err instanceof BffRequestError) {
      if (err.mapped.kind === 'unauthorized' || err.mapped.status === 401) {
        this.session.clear();
        void this.router.navigateByUrl('/login');
        return;
      }
      const kind = err.mapped.bannerKind;
      if (kind) {
        this.bannerKind.set(kind);
        this.bannerMessage.set(err.mapped.message);
        return;
      }
    }
    // No partial list and no client-side join fallback (T3 whole-or-nothing).
    this.bannerKind.set('composition');
    this.bannerMessage.set('Serviço de composição indisponível.');
  }
}
