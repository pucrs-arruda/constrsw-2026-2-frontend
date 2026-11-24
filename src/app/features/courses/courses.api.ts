import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { APP_CONFIG } from '../../core/config/app-config';

export interface CourseFields {
  code: string;
  name: string;
  workloadHours: number;
  syllabus?: string;
}
export interface ReferenceFields {
  title: string;
  authors: string;
  type: 'BASIC' | 'SUPPLEMENTARY';
  publisher?: string;
  year?: number;
  edition?: string;
}
export interface ItemFields {
  order: number;
  kind: 'CONTENT' | 'BIBLIOGRAPHY' | 'CRITERION';
  statement: string;
}
export interface Reference extends ReferenceFields {
  id: string;
}
export interface PlanItem extends ItemFields {
  id: string;
}
export interface SemesterClass {
  id: string;
  code?: string | null;
  label?: string | null;
  year: number;
  semester: number;
  seats: number;
}
export interface Course extends CourseFields {
  id: string;
  bibliographicReferences: Reference[];
  syllabusItems: PlanItem[];
}
export interface CourseDetail extends Course {
  classes: SemesterClass[];
}
export const referenceTypes = { BASIC: 'Básica', SUPPLEMENTARY: 'Complementar' } as const;
export const itemKinds = {
  CONTENT: 'Conteúdo',
  BIBLIOGRAPHY: 'Bibliografia',
  CRITERION: 'Critério',
} as const;
export type Resource = 'course' | 'reference' | 'item';
export type Target =
  | { kind: 'course'; course?: Course }
  | { kind: 'reference'; course: Course; reference?: Reference }
  | { kind: 'item'; course: Course; item?: PlanItem };
export type ExistingTarget =
  | { kind: 'course'; course: Course }
  | { kind: 'reference'; course: Course; reference: Reference }
  | { kind: 'item'; course: Course; item: PlanItem };

export function courseError(
  error: unknown,
  kind: Resource,
  action: 'read' | 'save' | 'delete',
): string {
  const status = error instanceof HttpErrorResponse ? error.status : 0;
  switch (status) {
    case 401:
      return 'Sessão expirada. Entre novamente para continuar.';
    case 403:
      return 'Seu perfil não tem permissão para esta ação.';
    case 404:
      return 'Este registro já não está disponível.';
    case 400:
      return 'Confira os campos informados e tente novamente.';
    case 409:
      if (action === 'save' && kind === 'course')
        return 'Este código já está em uso. Informe outro código.';
      if (action === 'save' && kind === 'item')
        return 'Já existe um item nesta ordem. Escolha outra posição.';
      if (action === 'delete' && kind === 'reference')
        return 'A disciplina precisa manter pelo menos uma referência bibliográfica.';
      return 'O registro não permite esta alteração.';
    case 503:
      if (action === 'read') return 'Serviço de composição indisponível.';
  }
  return 'Serviço de disciplinas indisponível. Tente novamente.';
}

@Injectable({ providedIn: 'root' })
export class CoursesApi {
  private readonly http = inject(HttpClient);
  private readonly base = inject(APP_CONFIG).bffBaseUrl.replace(/\/$/, '') + '/api/v1/courses';
  private readonly session = { withCredentials: true };
  private courseUrl(id: string) {
    return this.base + '/' + encodeURIComponent(id);
  }

  list() {
    return this.http.get<CourseDetail[]>(this.base, this.session);
  }
  get(id: string) {
    return this.http.get<CourseDetail>(this.courseUrl(id), this.session);
  }
  create(fields: CourseFields, reference: ReferenceFields) {
    return this.http.post<Course>(
      this.base,
      { ...fields, bibliographicReferences: [reference] },
      this.session,
    );
  }
  update(id: string, fields: CourseFields) {
    return this.http.put<Course>(this.courseUrl(id), fields, this.session);
  }
  saveReference(courseId: string, fields: ReferenceFields, id?: string) {
    const url = this.courseUrl(courseId) + '/bibliographic-references';
    return id
      ? this.http.put<Reference>(url + '/' + encodeURIComponent(id), fields, this.session)
      : this.http.post<Reference>(url, fields, this.session);
  }
  saveItem(courseId: string, fields: ItemFields, id?: string) {
    const url = this.courseUrl(courseId) + '/syllabus-items';
    return id
      ? this.http.patch<PlanItem>(url + '/' + encodeURIComponent(id), fields, this.session)
      : this.http.post<PlanItem>(url, fields, this.session);
  }
  remove(target: ExistingTarget) {
    let url = this.courseUrl(target.course.id);
    if (target.kind === 'reference')
      url += '/bibliographic-references/' + encodeURIComponent(target.reference.id);
    if (target.kind === 'item') url += '/syllabus-items/' + encodeURIComponent(target.item.id);
    return this.http.delete<void>(url, this.session);
  }
}
