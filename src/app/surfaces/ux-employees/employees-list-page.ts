import {
  Component,
  DestroyRef,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { Router } from '@angular/router';
import { BffRequestError, type AlertBannerKind } from '../../shared/http';
import {
  AlertBanner,
  EmptyState,
  ResponsiveDataTable,
  SkeletonBlock,
  type DataTableColumn,
  type DataTableRow,
} from '../../shared/ui';
import { AuthSession } from '../../shell/auth-session';
import { IdentityApi } from '../../shell/identity-api';
import { EmployeesApi, type EmployeeRead } from './employees-api';

const EMPLOYEE_COLUMNS: readonly DataTableColumn[] = [
  { key: 'name', header: 'Nome', priority: 'high' },
  // Situação as 2nd high-priority so compact secondary line surfaces Inativo.
  { key: 'statusLabel', header: 'Situação', priority: 'high' },
  { key: 'registrationNumber', header: 'Matrícula', priority: 'high' },
  { key: 'email', header: 'E-mail', priority: 'low' },
  { key: 'position', header: 'Cargo', priority: 'low' },
];

function statusLabel(status: EmployeeRead['status']): string {
  return status === 'Active' ? 'Ativo' : 'Inativo';
}

function toRow(employee: EmployeeRead): DataTableRow {
  return {
    id: employee.id,
    name: employee.name,
    registrationNumber: employee.registrationNumber,
    statusLabel: statusLabel(employee.status),
    email: employee.email ?? '',
    position: employee.position,
  };
}

function matchesSearch(employee: EmployeeRead, query: string): boolean {
  const haystacks = [
    employee.name,
    employee.email ?? '',
    employee.registrationNumber,
    employee.position,
  ];
  return haystacks.some((value) => value.toLowerCase().includes(query));
}

@Component({
  selector: 'app-employees-list-page',
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
  templateUrl: './employees-list-page.html',
  styleUrl: './employees-list-page.scss',
})
export class EmployeesListPage implements OnInit {
  private readonly employeesApi = inject(EmployeesApi);
  private readonly identityApi = inject(IdentityApi);
  private readonly session = inject(AuthSession);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  readonly columns = EMPLOYEE_COLUMNS;

  readonly loading = signal(true);
  readonly employees = signal<EmployeeRead[]>([]);
  readonly searchQuery = signal('');
  readonly bannerKind = signal<AlertBannerKind | null>(null);
  readonly bannerMessage = signal('');
  readonly canCreate = signal(false);

  readonly filteredRows = computed(() => {
    const query = this.searchQuery().trim().toLowerCase();
    const list = this.employees();
    const filtered = query
      ? list.filter((employee) => matchesSearch(employee, query))
      : list;
    return filtered.map(toRow);
  });

  readonly showEmpty = computed(
    () => !this.loading() && !this.bannerKind() && this.employees().length === 0,
  );

  readonly showNoSearchResults = computed(
    () =>
      !this.loading() &&
      !this.bannerKind() &&
      this.employees().length > 0 &&
      this.filteredRows().length === 0,
  );

  readonly showTable = computed(
    () =>
      !this.loading() &&
      !this.bannerKind() &&
      this.filteredRows().length > 0,
  );

  ngOnInit(): void {
    this.loadCanCreate();
    this.loadEmployees();
  }

  onSearchInput(value: string): void {
    this.searchQuery.set(value);
  }

  onCreate(): void {
    void this.router.navigateByUrl('/funcionarios/novo');
  }

  onOpenRow(row: DataTableRow): void {
    const id = row.id;
    if (id == null || id === '') {
      return;
    }
    void this.router.navigateByUrl(`/funcionarios/${id}`);
  }

  private loadCanCreate(): void {
    this.identityApi
      .me()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (me) => {
          this.canCreate.set((me.papeis ?? []).includes('funcionario'));
        },
        error: () => {
          this.canCreate.set(false);
        },
      });
  }

  private loadEmployees(): void {
    this.loading.set(true);
    this.bannerKind.set(null);
    this.bannerMessage.set('');

    this.employeesApi
      .list()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (list) => {
          this.employees.set(list);
          this.loading.set(false);
        },
        error: (err: unknown) => {
          this.employees.set([]);
          this.loading.set(false);
          this.showListError(err);
        },
      });
  }

  private showListError(err: unknown): void {
    if (err instanceof BffRequestError) {
      if (err.mapped.kind === 'unauthorized' || err.mapped.status === 401) {
        this.canCreate.set(false);
        this.session.clear();
        void this.router.navigateByUrl('/login');
        return;
      }
      const kind = err.mapped.bannerKind;
      if (kind === 'composition' || kind === 'identity') {
        this.bannerKind.set(kind);
        this.bannerMessage.set(err.mapped.message);
        return;
      }
      if (kind === 'refusal') {
        this.bannerKind.set('refusal');
        this.bannerMessage.set(err.mapped.message);
        return;
      }
    }
    this.bannerKind.set('composition');
    this.bannerMessage.set('Serviço de composição indisponível.');
  }
}
