import { BreakpointObserver } from '@angular/cdk/layout';
import { Component, DestroyRef, ElementRef, afterRenderEffect, computed, inject, signal, viewChild } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Subscription, forkJoin } from 'rxjs';
import { AlertBanner, EmptyState, SkeletonBlock, openConfirmDialog, openEditDialog } from '../../shared/ui';
import { IdentityApi, IdentityMe } from '../../shell/identity-api';
import { ClassesApiService } from '../ux-classes/data/classes-api.service';
import { ClassItem, ClassesLookups, formatRoomLabel } from '../ux-classes/data/classes.models';
import { LessonsApiService } from './data/lessons-api.service';
import { Lesson, LessonTopic, LessonUiError, displayLessonDate, lessonError, lessonPermissions } from './data/lessons.models';
import { LessonFormData, LessonFormDialog } from './lesson-form.dialog';
import { TopicFormData, TopicFormDialog } from './topic-form.dialog';

@Component({
  selector: 'app-lesson-detail-page', standalone: true,
  imports: [RouterLink, MatButtonModule, AlertBanner, EmptyState, SkeletonBlock],
  templateUrl: './lesson-detail.page.html', styleUrl: './lesson-detail.page.scss',
})
export class LessonDetailPage {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly api = inject(LessonsApiService);
  private readonly classes = inject(ClassesApiService);
  private readonly identityApi = inject(IdentityApi);
  private readonly dialog = inject(MatDialog);
  private readonly breakpoints = inject(BreakpointObserver);
  private readonly destroyRef = inject(DestroyRef);
  private loadRequest?: Subscription;
  readonly heading = viewChild<ElementRef<HTMLHeadingElement>>('lessonHeading');
  get classId(): string { return this.route.snapshot.paramMap.get('classId') ?? ''; }
  get lessonId(): string { return this.route.snapshot.paramMap.get('lessonId') ?? ''; }
  readonly loading = signal(true);
  readonly busy = signal(false);
  readonly error = signal<LessonUiError | null>(null);
  readonly actionError = signal<LessonUiError | null>(null);
  readonly identityError = signal(false);
  readonly lesson = signal<Lesson | null>(null);
  readonly classItem = signal<ClassItem | null>(null);
  readonly lookups = signal<ClassesLookups>({ courses: [], rooms: [], professors: [] });
  readonly identity = signal<IdentityMe | null>(null);
  readonly notice = signal('');
  readonly permissions = computed(() => lessonPermissions(this.identity(), this.classItem()?.professorId ?? ''));
  readonly dateLabel = computed(() => displayLessonDate(this.lesson()?.date ?? ''));
  readonly topics = computed(() => [...(this.lesson()?.topics ?? [])].sort((a, b) => a.order - b.order));
  readonly room = computed(() => {
    const lesson = this.lesson();
    if (lesson?.modality === 'REMOTE') return 'Não se aplica à aula remota';
    return lesson?.effectiveRoomId ? formatRoomLabel(lesson.effectiveRoomId, this.lookups().rooms) : 'Não informada';
  });

  constructor() {
    this.loadIdentity();
    this.route.paramMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => this.load());
    afterRenderEffect(() => this.heading()?.nativeElement.focus());
  }

  loadIdentity(): void {
    this.identityError.set(false);
    this.identityApi.me().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: identity => this.identity.set(identity),
      error: () => { this.identity.set(null); this.identityError.set(true); },
    });
  }

  load(): void {
    this.loadRequest?.unsubscribe();
    this.loading.set(true); this.error.set(null);
    this.loadRequest = forkJoin({ lesson: this.api.get(this.lessonId), classItem: this.classes.getClass(this.classId), lookups: this.classes.loadLookups() })
      .pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
        next: ({ lesson, classItem, lookups }) => {
          this.loading.set(false);
          if (lesson.classId !== classItem.id) {
            this.error.set({ kind: 'refusal', message: 'Esta aula não pertence à turma informada.' }); return;
          }
          this.lesson.set(lesson); this.classItem.set(classItem); this.lookups.set(lookups);
        },
        error: error => { this.loading.set(false); this.error.set(lessonError(error)); },
      });
  }

  edit(): void {
    const lesson = this.lesson(), classItem = this.classItem();
    if (!lesson || !classItem || !this.permissions().edit || this.busy()) return;
    openEditDialog<LessonFormDialog, LessonFormData, Lesson>(this.dialog, LessonFormDialog, this.breakpoints,
      { data: { lesson, classItem } }).afterClosed().subscribe(saved => {
      if (saved) { this.lesson.set(saved); this.notice.set('Aula salva.'); }
    });
  }

  editTopic(topic?: LessonTopic): void {
    const lesson = this.lesson(), classItem = this.classItem();
    if (!lesson || !classItem || !this.permissions().edit || this.busy()) return;
    openEditDialog<TopicFormDialog, TopicFormData, LessonTopic>(this.dialog, TopicFormDialog, this.breakpoints, {
      data: { lessonId: lesson.id, courseId: classItem.courseId, topic,
        nextOrder: Math.min(32767, Math.max(0, ...lesson.topics.map(item => item.order)) + 1) },
    }).afterClosed().subscribe(saved => { if (saved) { this.notice.set('Tópico salvo.'); this.load(); } });
  }

  removeTopic(topic: LessonTopic): void {
    if (!this.permissions().edit || this.busy()) return;
    openConfirmDialog(this.dialog, { title: 'Excluir tópico?', message: 'O tópico deixará de aparecer nesta aula.', confirmLabel: 'Excluir tópico' },
      this.breakpoints).afterClosed().subscribe(confirmed => {
      if (!confirmed || this.busy()) return;
      this.busy.set(true); this.actionError.set(null);
      this.api.removeTopic(this.lessonId, topic.id).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
        next: () => { this.busy.set(false); this.notice.set('Tópico excluído.'); this.load(); },
        error: error => { this.busy.set(false); this.actionError.set(lessonError(error)); },
      });
    });
  }

  remove(): void {
    if (!this.permissions().manage || this.busy()) return;
    openConfirmDialog(this.dialog, { title: 'Excluir aula?',
      message: 'A aula e seus tópicos deixarão de aparecer. Reservas vinculadas podem impedir a exclusão.', confirmLabel: 'Excluir aula' },
      this.breakpoints).afterClosed().subscribe(confirmed => {
      if (!confirmed || this.busy()) return;
      this.busy.set(true); this.actionError.set(null);
      this.api.remove(this.lessonId).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
        next: () => { void this.router.navigate(['/turmas', this.classId], { queryParams: { aba: 'aulas' } }); },
        error: error => { this.busy.set(false); this.actionError.set(lessonError(error)); },
      });
    });
  }
}
