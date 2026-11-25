import { BreakpointObserver } from '@angular/cdk/layout';
import {
  Component,
  OnInit,
  computed,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import {
  AlertBanner,
  DataTableColumn,
  DataTableRow,
  EmptyState,
  ResponsiveDataTable,
  SkeletonBlock,
  openConfirmDialog,
} from '../../../shared/ui';
import { ClassesApiService } from '../data/classes-api.service';
import {
  ClassItem,
  StudentLookup,
  UiErrorState,
  extractProblemUiError,
} from '../data/classes.models';

interface EnrolledRow extends DataTableRow {
  id: string;
  name: string;
  registration: string;
  email: string;
  situation: string;
}

@Component({
  selector: 'app-class-enrollments-tab',
  standalone: true,
  imports: [
    MatButtonModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    AlertBanner,
    EmptyState,
    ResponsiveDataTable,
    SkeletonBlock,
  ],
  templateUrl: './class-enrollments-tab.html',
  styleUrl: './class-enrollments-tab.scss',
})
export class ClassEnrollmentsTab implements OnInit {
  private readonly api = inject(ClassesApiService);
  private readonly dialog = inject(MatDialog);
  private readonly breakpoints = inject(BreakpointObserver);

  readonly classItem = input.required<ClassItem>();
  readonly classUpdated = output<ClassItem>();

  readonly loadingStudents = signal(true);
  readonly studentsError = signal<UiErrorState | null>(null);
  readonly mutationError = signal<UiErrorState | null>(null);
  readonly saving = signal(false);
  readonly pickerOpen = signal(false);

  readonly allStudents = signal<StudentLookup[]>([]);
  readonly enrolledSearch = signal('');
  readonly pickerSearch = signal('');

  readonly columns: readonly DataTableColumn[] = [
    { key: 'name', header: 'Aluno', priority: 'high' },
    { key: 'registration', header: 'Matrícula', priority: 'high' },
    { key: 'email', header: 'E-mail', priority: 'low' },
    { key: 'situation', header: 'Situação', priority: 'low' },
  ];

  readonly isClosed = computed(() => this.classItem().status === 'closed');

  readonly enrolledSet = computed(() => new Set(this.classItem().studentIds ?? []));

  readonly enrolledRows = computed<EnrolledRow[]>(() => {
    const ids = this.classItem().studentIds ?? [];
    const catalog = new Map(this.allStudents().map((s) => [s.id, s]));
    const term = this.enrolledSearch().trim().toLowerCase();

    return ids
      .map((id) => {
        const student = catalog.get(id);
        return {
          id,
          name: student?.name ?? `Aluno ${id.slice(0, 8)}`,
          registration: student?.registration_number ?? id,
          email: student?.email ?? '—',
          situation: 'Matriculado',
        };
      })
      .filter((row) => {
        if (!term) {
          return true;
        }
        return (
          row.name.toLowerCase().includes(term) ||
          row.registration.toLowerCase().includes(term) ||
          row.email.toLowerCase().includes(term)
        );
      });
  });

  readonly availableStudents = computed<StudentLookup[]>(() => {
    const enrolled = this.enrolledSet();
    const term = this.pickerSearch().trim().toLowerCase();

    return this.allStudents()
      .filter((s) => !enrolled.has(s.id) && s.enabled !== false)
      .filter((s) => {
        if (!term) {
          return true;
        }
        return (
          s.name.toLowerCase().includes(term) ||
          s.registration_number.toLowerCase().includes(term) ||
          s.email.toLowerCase().includes(term)
        );
      });
  });

  ngOnInit(): void {
    this.loadStudents();
  }

  loadStudents(): void {
    this.loadingStudents.set(true);
    this.studentsError.set(null);

    this.api.listStudents().subscribe({
      next: (students) => {
        this.allStudents.set(Array.isArray(students) ? students : []);
        this.loadingStudents.set(false);
      },
      error: (err) => {
        this.loadingStudents.set(false);
        this.studentsError.set(
          extractProblemUiError(
            err,
            'Não foi possível carregar o catálogo de alunos.',
          ),
        );
      },
    });
  }

  togglePicker(): void {
    this.mutationError.set(null);
    this.pickerOpen.update((open) => !open);
  }

  onEnrolledSearch(event: Event): void {
    this.enrolledSearch.set((event.target as HTMLInputElement).value);
  }

  onPickerSearch(event: Event): void {
    this.pickerSearch.set((event.target as HTMLInputElement).value);
  }

  associateStudent(student: StudentLookup): void {
    if (this.saving() || this.isClosed()) {
      return;
    }
    this.mutationError.set(null);
    const current = this.classItem();
    const nextIds = Array.from(new Set([...(current.studentIds ?? []), student.id]));

    this.saving.set(true);
    this.api.patchClass(current.id, { studentIds: nextIds }).subscribe({
      next: (updated) => {
        this.saving.set(false);
        this.classUpdated.emit(updated);
      },
      error: (err) => {
        this.saving.set(false);
        this.mutationError.set(
          extractProblemUiError(
            err,
            'Não foi possível associar o aluno à turma.',
          ),
        );
      },
    });
  }

  onRemoveStudent(row: DataTableRow): void {
    if (this.saving() || this.isClosed()) {
      return;
    }
    this.mutationError.set(null);
    const enrolled = row as EnrolledRow;
    const current = this.classItem();
    const classCode = current.code?.trim() || current.label?.trim() || 'esta turma';

    const ref = openConfirmDialog(
      this.dialog,
      {
        title: `Desassociar ${enrolled.name}?`,
        message: `O aluno ${enrolled.name} (${enrolled.registration}) será removido da lista de matriculados da turma ${classCode}. O cadastro do aluno não é excluído.`,
        confirmLabel: 'Desassociar',
        cancelLabel: 'Cancelar',
      },
      this.breakpoints,
    );

    ref.afterClosed().subscribe((confirmed) => {
      if (!confirmed) {
        return;
      }
      const nextIds = (current.studentIds ?? []).filter((id) => id !== enrolled.id);
      this.saving.set(true);
      this.api.patchClass(current.id, { studentIds: nextIds }).subscribe({
        next: (updated) => {
          this.saving.set(false);
          this.classUpdated.emit(updated);
        },
        error: (err) => {
          this.saving.set(false);
          this.mutationError.set(
            extractProblemUiError(
              err,
              'Não foi possível desassociar o aluno da turma.',
            ),
          );
        },
      });
    });
  }
}
