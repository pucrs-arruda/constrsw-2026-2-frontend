import { BreakpointObserver } from '@angular/cdk/layout';
import { Component, DestroyRef, computed, effect, inject, input, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { Router } from '@angular/router';
import { AlertBanner, DataTableColumn, DataTableRow, EmptyState, ResponsiveDataTable, SkeletonBlock, openConfirmDialog, openEditDialog } from '../../shared/ui';
import { IdentityApi, IdentityMe } from '../../shell/identity-api';
import { ClassItem, RoomLookup, formatRoomLabel } from '../ux-classes/data/classes.models';
import { LessonsApiService } from './data/lessons-api.service';
import { Lesson, LessonUiError, displayLessonDate, lessonError, lessonPermissions } from './data/lessons.models';
import { LessonFormData, LessonFormDialog } from './lesson-form.dialog';

@Component({
  selector: 'app-class-lessons-tab', standalone: true,
  imports: [MatButtonModule, MatFormFieldModule, MatInputModule, MatIconModule,
    AlertBanner, EmptyState, ResponsiveDataTable, SkeletonBlock],
  templateUrl: './class-lessons-tab.html', styleUrl: './class-lessons-tab.scss',
})
export class ClassLessonsTab {
  readonly classItem = input.required<ClassItem>();
  readonly rooms = input<readonly RoomLookup[]>([]);
  private readonly api = inject(LessonsApiService);
  private readonly identityApi = inject(IdentityApi);
  private readonly dialog = inject(MatDialog);
  private readonly breakpoints = inject(BreakpointObserver);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  readonly lessons = signal<Lesson[]>([]);
  readonly loading = signal(true);
  readonly busy = signal(false);
  readonly error = signal<LessonUiError | null>(null);
  readonly identityError = signal(false);
  readonly identity = signal<IdentityMe | null>(null);
  readonly search = signal('');
  readonly notice = signal('');
  readonly permissions = computed(() => lessonPermissions(this.identity(), this.classItem().professorId));
  readonly columns: DataTableColumn[] = [
    { key: 'dateLabel', header: 'Data · Faixa', priority: 'high' },
    { key: 'summary', header: 'Tópicos · Sala efetiva', priority: 'high' },
    { key: 'modalityLabel', header: 'Modalidade', priority: 'low' },
  ];
  readonly rows = computed<DataTableRow[]>(() => {
    const search = this.search().trim().toLocaleLowerCase('pt-BR');
    return [...this.lessons()].sort((a, b) => a.date.localeCompare(b.date) || a.timeSlotId.localeCompare(b.timeSlotId))
      .filter(lesson => !search || lesson.topics.some(topic => (topic.statement ?? '').toLocaleLowerCase('pt-BR').includes(search)))
      .map(lesson => ({
        id: lesson.id,
        dateLabel: `${displayLessonDate(lesson.date)} · Faixa ${lesson.timeSlotId}`,
        summary: `${lesson.topics.map(topic => topic.statement || 'Item do plano de ensino').join('; ') || 'Sem tópicos'} · ${lesson.modality === 'REMOTE' ? 'Remota' : 'Sala efetiva ' + (lesson.effectiveRoomId ? formatRoomLabel(lesson.effectiveRoomId, this.rooms()) : 'não informada')}${lesson.hasAssessment ? ' · Com avaliação' : ''}`,
        modalityLabel: lesson.modality === 'REMOTE' ? 'Remota' : 'Presencial',
      }));
  });

  constructor() {
    this.loadIdentity();
    effect(() => this.load(this.classItem().id));
  }

  loadIdentity(): void {
    this.identityError.set(false);
    this.identityApi.me().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: identity => this.identity.set(identity),
      error: () => { this.identity.set(null); this.identityError.set(true); },
    });
  }

  load(classId = this.classItem().id): void {
    this.loading.set(true);
    this.error.set(null);
    this.api.list(classId).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: lessons => { this.lessons.set(lessons); this.loading.set(false); },
      error: error => { this.error.set(lessonError(error)); this.loading.set(false); },
    });
  }

  open(row: DataTableRow): void {
    void this.router.navigate(['/turmas', this.classItem().id, 'aulas', String(row.id)]);
  }

  edit(row?: DataTableRow): void {
    if (this.busy() || (row ? !this.permissions().edit : !this.permissions().manage)) return;
    const lesson = row ? this.lessons().find(item => item.id === row.id) : undefined;
    if (row && !lesson) return;
    openEditDialog<LessonFormDialog, LessonFormData, Lesson>(this.dialog, LessonFormDialog, this.breakpoints,
      { data: { classItem: this.classItem(), lesson } }).afterClosed().subscribe(saved => {
      if (saved) { this.notice.set('Aula salva.'); this.load(); }
    });
  }

  generate(): void {
    if (!this.permissions().manage || this.busy()) return;
    openConfirmDialog(this.dialog, {
      title: 'Gerar aulas da turma?',
      message: 'As aulas serão criadas a partir da grade semanal e do período da turma. Nenhuma sala será reservada automaticamente.',
      confirmLabel: 'Gerar aulas',
    }, this.breakpoints).afterClosed().subscribe(confirmed => {
      if (!confirmed || this.busy()) return;
      this.run(this.api.generate(this.classItem().id), 'Aulas geradas.');
    });
  }

  remove(row: DataTableRow): void {
    if (!this.permissions().manage || this.busy()) return;
    openConfirmDialog(this.dialog, { title: 'Excluir aula?',
      message: 'A aula e seus tópicos deixarão de aparecer. A exclusão pode ser recusada caso existam reservas vinculadas.',
      confirmLabel: 'Excluir aula' }, this.breakpoints).afterClosed().subscribe(confirmed => {
      if (confirmed && !this.busy()) this.run(this.api.remove(String(row.id)), 'Aula excluída.');
    });
  }

  private run(request: import('rxjs').Observable<unknown>, notice: string): void {
    this.busy.set(true); this.error.set(null); this.notice.set('');
    request.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => { this.busy.set(false); this.notice.set(notice); this.load(); },
      error: error => { this.busy.set(false); this.error.set(lessonError(error)); },
    });
  }
}
