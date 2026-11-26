import { Injectable, inject } from '@angular/core';
import { catchError, Observable, of, throwError } from 'rxjs';
import { BffClient, BffRequestError } from '../../../shared/http';
import { Lesson, LessonInput, LessonTopic, LessonUpdate, SyllabusItem, TopicInput } from './lessons.models';

const prefix = '/v1/lessons';
const id = (value: string) => encodeURIComponent(value);

@Injectable({ providedIn: 'root' })
export class LessonsApiService {
  private readonly bff = inject(BffClient);

  list(classId: string): Observable<Lesson[]> {
    return this.bff.get<Lesson[]>(prefix, { params: { classId } }).pipe(
      catchError(error => error instanceof BffRequestError && error.http.status === 404 && error.http.error?.error_code === 'LE-404'
        ? of([]) : throwError(() => error)),
    );
  }
  get(lessonId: string) { return this.bff.get<Lesson>(`${prefix}/${id(lessonId)}`); }
  create(body: LessonInput) { return this.bff.post<Lesson>(prefix, body); }
  update(lessonId: string, body: LessonUpdate) { return this.bff.put<Lesson>(`${prefix}/${id(lessonId)}`, body); }
  remove(lessonId: string) { return this.bff.delete<void>(`${prefix}/${id(lessonId)}`); }
  generate(classId: string) { return this.bff.post<Lesson[]>(`${prefix}/generate`, { classId }); }
  createTopic(lessonId: string, body: TopicInput) {
    return this.bff.post<LessonTopic>(`${prefix}/${id(lessonId)}/topics`, body);
  }
  updateTopic(lessonId: string, topicId: string, body: TopicInput) {
    return this.bff.put<LessonTopic>(`${prefix}/${id(lessonId)}/topics/${id(topicId)}`, body);
  }
  removeTopic(lessonId: string, topicId: string) {
    return this.bff.delete<void>(`${prefix}/${id(lessonId)}/topics/${id(topicId)}`);
  }
  syllabus(courseId: string) {
    return this.bff.get<SyllabusItem[]>(`/v1/courses/${id(courseId)}/syllabus-items`);
  }
}
