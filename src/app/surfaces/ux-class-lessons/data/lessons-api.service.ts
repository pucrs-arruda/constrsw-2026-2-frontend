import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, Observable, of, switchMap, throwError } from 'rxjs';
import { BffClient, BffRequestError } from '../../../shared/http';
import { AuthSession } from '../../../shell/auth-session';
import { Lesson, LessonInput, LessonTopic, LessonUpdate, SyllabusItem, TopicInput } from './lessons.models';

const prefix = '/v1/lessons';
const id = (value: string) => encodeURIComponent(value);

@Injectable({ providedIn: 'root' })
export class LessonsApiService {
  private readonly bff = inject(BffClient);
  private readonly session = inject(AuthSession);
  private readonly router = inject(Router);

  list(classId: string): Observable<Lesson[]> {
    return this.authed(() => this.bff.get<Lesson[]>(prefix, { params: { classId } })).pipe(
      catchError(error => error instanceof BffRequestError && error.http.status === 404 && error.http.error?.error_code === 'LE-404'
        ? of([]) : throwError(() => error)),
    );
  }
  get(lessonId: string) { return this.authed(() => this.bff.get<Lesson>(`${prefix}/${id(lessonId)}`)); }
  create(body: LessonInput) { return this.authed(() => this.bff.post<Lesson>(prefix, body)); }
  update(lessonId: string, body: LessonUpdate) { return this.authed(() => this.bff.put<Lesson>(`${prefix}/${id(lessonId)}`, body)); }
  remove(lessonId: string) { return this.authed(() => this.bff.delete<void>(`${prefix}/${id(lessonId)}`)); }
  generate(classId: string) { return this.authed(() => this.bff.post<Lesson[]>(`${prefix}/generate`, { classId })); }
  createTopic(lessonId: string, body: TopicInput) {
    return this.authed(() => this.bff.post<LessonTopic>(`${prefix}/${id(lessonId)}/topics`, body));
  }
  updateTopic(lessonId: string, topicId: string, body: TopicInput) {
    return this.authed(() => this.bff.put<LessonTopic>(`${prefix}/${id(lessonId)}/topics/${id(topicId)}`, body));
  }
  removeTopic(lessonId: string, topicId: string) {
    return this.authed(() => this.bff.delete<void>(`${prefix}/${id(lessonId)}/topics/${id(topicId)}`));
  }
  syllabus(courseId: string) {
    return this.authed(() => this.bff.get<SyllabusItem[]>(`/v1/courses/${id(courseId)}/syllabus-items`));
  }

  private authed<T>(call: () => Observable<T>): Observable<T> {
    return call().pipe(catchError((error: unknown) => {
      if (!(error instanceof BffRequestError) || error.http.status !== 401) return throwError(() => error);
      // Repeat only an explicit authentication refusal, never a timeout or a failed write.
      return this.session.refresh().pipe(
        catchError(() => this.expire(error)),
        switchMap(() => call().pipe(catchError((retryError: unknown) =>
          retryError instanceof BffRequestError && retryError.http.status === 401
            ? this.expire(retryError) : throwError(() => retryError),
        ))),
      );
    }));
  }

  private expire(error: unknown): Observable<never> {
    this.session.clear();
    void this.router.navigateByUrl('/login');
    return throwError(() => error);
  }
}
