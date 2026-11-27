import { HttpErrorResponse } from '@angular/common/http';
import { BffRequestError } from '../../../shared/http';
import { AlertBannerKind } from '../../../shared/ui';
import { IdentityMe } from '../../../shell/identity-api';

export const TIME_SLOTS = [...'ABCDEFGHIJKLMN', 'P'];
export type LessonModality = 'IN_PERSON' | 'REMOTE';
export interface TopicInput { order: number; statement?: string; syllabusItemId?: string }
export interface LessonTopic extends TopicInput { id: string; lessonId: string; enabled: boolean }
export interface LessonInput {
  classId: string; date: string; timeSlotId: string;
  modality: LessonModality; hasAssessment: boolean; topics?: TopicInput[];
}
export interface Lesson extends Omit<LessonInput, 'topics'> {
  id: string; enabled: boolean; effectiveRoomId?: string; topics: LessonTopic[];
}
export type LessonUpdate = Pick<Lesson, 'modality' | 'hasAssessment'>;
export interface SyllabusItem { id: string; order: number; statement: string }
export interface LessonUiError { kind: AlertBannerKind; message: string }

export function lessonError(error: unknown): LessonUiError {
  const http = error instanceof BffRequestError ? error.http : error;
  if (http instanceof HttpErrorResponse) {
    if ([0, 502, 503, 504].includes(http.status)) return { kind: 'composition', message: '' };
    if (http.status === 401) return { kind: 'refusal', message: 'Sua sessão expirou. Entre novamente.' };
    const body = http.error as { error_description?: unknown; detail?: unknown } | null;
    const description = body?.error_description ?? body?.detail;
    if (typeof description === 'string' && description.trim()) return { kind: 'refusal', message: description };
  }
  return { kind: 'refusal', message: 'Não foi possível concluir a operação. Tente novamente.' };
}

export function lessonPermissions(identity: IdentityMe | null, professorId: string) {
  const roles = identity?.papeis ?? [];
  const coordinator = roles.some(role => ['coordinator', 'coordenador'].includes(role));
  const manage = coordinator || roles.includes('classes');
  return { manage, edit: coordinator || (roles.includes('professor') && !!professorId && identity?.professorId === professorId) };
}

export function displayLessonDate(date: string): string {
  return date.split('-').reverse().join('/');
}

export function validLessonDate(date: string, start: string, end: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || date < start || date > end) return false;
  const parsed = new Date(date + 'T12:00:00Z');
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().startsWith(date) && parsed.getUTCDay() !== 0;
}
