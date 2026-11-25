import { BreakpointObserver } from '@angular/cdk/layout';
import {
  Component,
  DestroyRef,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { EMPTY, catchError, map, switchMap } from 'rxjs';
import { BffRequestError, type AlertBannerKind } from '../../shared/http';
import {
  AlertBanner,
  EmptyState,
  ResponsiveDataTable,
  SkeletonBlock,
  openConfirmDialog,
  openEditDialog,
  type DataTableColumn,
  type DataTableRow,
} from '../../shared/ui';
import { AuthSession } from '../../shell/auth-session';
import { IdentityApi } from '../../shell/identity-api';
import {
  DependentFormDialog,
  type DependentFormDialogData,
} from './dependent-form-dialog';
import {
  EmployeeFormDialog,
  type EmployeeFormDialogData,
  type EmployeeFormDialogResult,
} from './employee-form-dialog';
import {
  EmployeesApi,
  type DependentRead,
  type EmployeeRead,
} from './employees-api';

const COMPACT_QUERY = '(max-width: 599.98px)';

const DEPENDENT_COLUMNS: readonly DataTableColumn[] = [
  { key: 'name', header: 'Nome', priority: 'high' },
  { key: 'dependencyType', header: 'Vínculo', priority: 'high' },
  { key: 'statusLabel', header: 'Situação', priority: 'high' },
  { key: 'birthDate', header: 'Nascimento', priority: 'low' },
];

function statusLabel(status: 'Active' | 'Inactive'): string {
  return status === 'Active' ? 'Ativo' : 'Inativo';
}

function formatDate(iso: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!match) {
    return iso;
  }
  return `${match[3]}/${match[2]}/${match[1]}`;
}

function formatSalary(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

function toDependentRow(dependent: DependentRead): DataTableRow {
  return {
    id: dependent.id,
    name: dependent.name,
    dependencyType: dependent.dependencyType,
    statusLabel: statusLabel(dependent.status),
    birthDate: formatDate(dependent.birthDate),
  };
}

@Component({
  selector: 'app-employees-detail-page',
  standalone: true,
  imports: [
    MatButtonModule,
    RouterLink,
    AlertBanner,
    EmptyState,
    ResponsiveDataTable,
    SkeletonBlock,
  ],
  templateUrl: './employees-detail-page.html',
  styleUrl: './employees-detail-page.scss',
})
export class EmployeesDetailPage implements OnInit {
  private readonly employeesApi = inject(EmployeesApi);
  private readonly identityApi = inject(IdentityApi);
  private readonly session = inject(AuthSession);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);
  private readonly dialog = inject(MatDialog);
  private readonly breakpoints = inject(BreakpointObserver);

  readonly columns = DEPENDENT_COLUMNS;

  readonly employeeId = toSignal(
    this.route.paramMap.pipe(map((params) => params.get('id') ?? '')),
    { initialValue: this.route.snapshot.paramMap.get('id') ?? '' },
  );

  readonly isCompact = toSignal(
    this.breakpoints.observe(COMPACT_QUERY).pipe(map((r) => r.matches)),
    { initialValue: this.breakpoints.isMatched(COMPACT_QUERY) },
  );

  readonly loading = signal(true);
  readonly notFound = signal(false);
  readonly employee = signal<EmployeeRead | null>(null);
  readonly bannerKind = signal<AlertBannerKind | null>(null);
  readonly bannerMessage = signal('');
  readonly canWriteDependents = signal(false);
  readonly deleting = signal(false);

  readonly dependentRows = computed(() =>
    (this.employee()?.dependents ?? [])
      .filter((dependent) => dependent.enabled)
      .map(toDependentRow),
  );

  readonly showMaster = computed(
    () => !this.loading() && !this.notFound() && this.employee() != null,
  );

  readonly showDependentsEmpty = computed(
    () => this.showMaster() && this.dependentRows().length === 0,
  );

  readonly showDependentsTable = computed(
    () => this.showMaster() && this.dependentRows().length > 0,
  );

  readonly statusDisplay = computed(() => {
    const emp = this.employee();
    return emp ? statusLabel(emp.status) : '';
  });

  readonly hireDateDisplay = computed(() => {
    const emp = this.employee();
    return emp ? formatDate(emp.hireDate) : '';
  });

  readonly salaryDisplay = computed(() => {
    const emp = this.employee();
    return emp ? formatSalary(emp.salary) : '';
  });

  ngOnInit(): void {
    this.loadCanWrite();
    this.route.paramMap
      .pipe(
        map((params) => params.get('id') ?? ''),
        switchMap((id) => {
          this.dialog.closeAll();
          if (!id) {
            this.loading.set(false);
            this.notFound.set(true);
            this.employee.set(null);
            this.bannerKind.set(null);
            this.bannerMessage.set('');
            return EMPTY;
          }

          this.loading.set(true);
          this.notFound.set(false);
          this.bannerKind.set(null);
          this.bannerMessage.set('');
          this.employee.set(null);
          this.deleting.set(false);

          return this.employeesApi.getById(id).pipe(
            catchError((err: unknown) => {
              this.employee.set(null);
              this.loading.set(false);
              this.showLoadError(err);
              return EMPTY;
            }),
          );
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((employee) => {
        this.employee.set({
          ...employee,
          dependents: employee.dependents ?? [],
        });
        this.loading.set(false);
      });
  }

  onEditEmployee(): void {
    const emp = this.employee();
    if (!emp || !this.canWriteDependents()) {
      return;
    }
    openEditDialog<
      EmployeeFormDialog,
      EmployeeFormDialogData,
      EmployeeFormDialogResult
    >(this.dialog, EmployeeFormDialog, this.breakpoints, {
      data: { mode: 'edit', employee: emp },
    })
      .afterClosed()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((result) => {
        if (result && typeof result === 'object' && result.id) {
          this.refreshEmployee(result.id);
        }
      });
  }

  onCreateDependent(): void {
    const id = this.employeeId();
    if (!id || !this.canWriteDependents()) {
      return;
    }
    this.openDependentDialog({ mode: 'create', employeeId: id });
  }

  onEditDependent(row: DataTableRow): void {
    const emp = this.employee();
    const dependentId = String(row.id ?? '');
    if (!emp || !dependentId || !this.canWriteDependents()) {
      return;
    }
    const dependent = emp.dependents.find((item) => item.id === dependentId);
    if (!dependent) {
      return;
    }
    this.openDependentDialog({
      mode: 'edit',
      employeeId: emp.id,
      dependent,
    });
  }

  onDeleteDependent(row: DataTableRow): void {
    const emp = this.employee();
    const dependentId = String(row.id ?? '');
    const name = String(row['name'] ?? 'dependente');
    if (!emp || !dependentId || !this.canWriteDependents() || this.deleting()) {
      return;
    }

    openConfirmDialog(
      this.dialog,
      {
        title: `Excluir ${name}?`,
        message: `Confirma a exclusão lógica de ${name}? Esta ação marca o dependente como excluído.`,
        confirmLabel: 'Excluir',
        cancelLabel: 'Cancelar',
      },
      this.breakpoints,
    )
      .afterClosed()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((confirmed) => {
        if (!confirmed || this.deleting()) {
          return;
        }
        this.deleting.set(true);
        this.employeesApi
          .deleteDependent(emp.id, dependentId)
          .pipe(takeUntilDestroyed(this.destroyRef))
          .subscribe({
            next: () => {
              this.deleting.set(false);
              this.refreshEmployee(emp.id);
            },
            error: (err: unknown) => {
              this.deleting.set(false);
              this.showPageError(err);
            },
          });
      });
  }

  private openDependentDialog(data: DependentFormDialogData): void {
    openEditDialog(this.dialog, DependentFormDialog, this.breakpoints, {
      data,
    })
      .afterClosed()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((saved) => {
        if (saved) {
          this.refreshEmployee(data.employeeId);
        }
      });
  }

  private loadCanWrite(): void {
    this.identityApi
      .me()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (me) => {
          this.canWriteDependents.set((me.papeis ?? []).includes('funcionario'));
        },
        error: () => {
          this.canWriteDependents.set(false);
        },
      });
  }

  private refreshEmployee(id: string): void {
    if (id !== this.employeeId()) {
      return;
    }
    this.employeesApi
      .getById(id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (employee) => {
          if (id !== this.employeeId()) {
            return;
          }
          this.employee.set({
            ...employee,
            dependents: employee.dependents ?? [],
          });
          this.bannerKind.set(null);
          this.bannerMessage.set('');
        },
        error: (err: unknown) => this.showPageError(err),
      });
  }

  private showLoadError(err: unknown): void {
    if (err instanceof BffRequestError) {
      if (err.mapped.kind === 'unauthorized' || err.mapped.status === 401) {
        this.canWriteDependents.set(false);
        this.session.clear();
        void this.router.navigateByUrl('/login');
        return;
      }
      if (err.mapped.status === 404) {
        this.notFound.set(true);
        return;
      }
      const kind = err.mapped.bannerKind;
      if (kind === 'composition' || kind === 'identity' || kind === 'refusal') {
        this.bannerKind.set(kind);
        this.bannerMessage.set(err.mapped.message);
        return;
      }
    }
    this.bannerKind.set('composition');
    this.bannerMessage.set('Serviço de composição indisponível.');
  }

  private showPageError(err: unknown): void {
    if (err instanceof BffRequestError) {
      if (err.mapped.kind === 'unauthorized' || err.mapped.status === 401) {
        this.canWriteDependents.set(false);
        this.session.clear();
        void this.router.navigateByUrl('/login');
        return;
      }
      if (err.mapped.status === 404) {
        this.notFound.set(true);
        this.employee.set(null);
        return;
      }
      const kind = err.mapped.bannerKind;
      if (kind === 'composition' || kind === 'identity' || kind === 'refusal') {
        this.bannerKind.set(kind);
        this.bannerMessage.set(err.mapped.message);
        return;
      }
    }
    this.bannerKind.set('refusal');
    this.bannerMessage.set('Não foi possível concluir a operação. Tente novamente.');
  }
}
