import { BffRequestError } from '../../../shared/http';

export type ClassStatus = 'active' | 'closed';

export interface ClassItem {
  id: string;
  enabled: boolean;
  courseId: string;
  startDate: string;
  endDate: string;
  year: number;
  semester: 1 | 2;
  seats: number;
  roomId: string;
  professorId: string;
  studentIds: string[];
  code?: string | null;
  label?: string | null;
  status: ClassStatus;
  modality?: string | null;
  averageRating?: number | null;
}

export interface ClassCreatePayload {
  courseId: string;
  startDate: string;
  endDate: string;
  year: number;
  semester: 1 | 2;
  seats: number;
  roomId: string;
  professorId: string;
  studentIds?: string[];
  code?: string;
  label?: string;
  status?: ClassStatus;
  modality?: string;
}

export interface ClassPatchPayload {
  seats?: number;
  roomId?: string;
  professorId?: string;
  studentIds?: string[];
  code?: string | null;
  label?: string | null;
  status?: ClassStatus;
  modality?: string | null;
}

export interface CourseLookup {
  id: string;
  code: string;
  name: string;
  enabled?: boolean;
}

export interface ProfessorLookup {
  _id?: string;
  id?: string;
  employeeId: string;
  active: boolean;
  appointment?: string;
  employeeName?: string | null;
  employeeEmail?: string | null;
  enabled?: boolean;
}

export interface RoomLookup {
  id: string;
  code: string;
  name: string;
  building: string;
  capacity: number;
  active: boolean;
  enabled?: boolean;
}

export interface StudentLookup {
  id: string;
  registration_number: string;
  name: string;
  email: string;
  enabled?: boolean;
}

export type LookupDomain = 'courses' | 'professors' | 'rooms';

export interface ClassesLookups {
  courses: CourseLookup[];
  professors: ProfessorLookup[];
  rooms: RoomLookup[];
  unavailable?: readonly LookupDomain[];
}

export function professorIdOf(prof: ProfessorLookup): string {
  return prof._id ?? prof.id ?? prof.employeeId;
}

export function formatCourseLabel(
  courseId: string,
  courses: readonly CourseLookup[],
): string {
  const found = courses.find((c) => c.id === courseId);
  if (!found) {
    return courseId;
  }
  return found.name ? `${found.name}` : found.code;
}

export function formatRoomLabel(
  roomId: string,
  rooms: readonly RoomLookup[],
): string {
  const found = rooms.find((r) => r.id === roomId);
  if (!found) {
    return roomId;
  }
  return found.code || found.name;
}

export function formatProfessorLabel(
  professorId: string,
  professors: readonly ProfessorLookup[],
): string {
  const found = professors.find((p) => professorIdOf(p) === professorId);
  if (!found) {
    return professorId;
  }
  const base =
    found.employeeName?.trim() ||
    found.employeeEmail?.trim() ||
    `Docente ${professorId.slice(0, 8)}`;
  return found.active ? base : `${base} (Inativo)`;
}

export function formatPeriod(year: number, semester: number): string {
  return `${year}/${semester}`;
}

export function formatClassStatus(status: ClassStatus): string {
  return status === 'closed' ? 'Encerrada' : 'Ativa';
}

export function currentAcademicPeriod(now: Date = new Date()): {
  year: number;
  semester: 1 | 2;
} {
  try {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/Sao_Paulo',
      year: 'numeric',
      month: '2-digit',
    }).formatToParts(now);
    const year = Number(parts.find((p) => p.type === 'year')?.value ?? now.getFullYear());
    const month = Number(parts.find((p) => p.type === 'month')?.value ?? now.getMonth() + 1);
    return { year, semester: month < 8 ? 1 : 2 };
  } catch {
    return { year: now.getFullYear(), semester: now.getMonth() + 1 < 8 ? 1 : 2 };
  }
}

export interface UiErrorState {
  kind: 'refusal' | 'composition' | 'identity';
  message: string;
}

export function extractProblemUiError(
  err: unknown,
  fallback = 'Não foi possível concluir a operação. Tente novamente.',
): UiErrorState {
  if (err instanceof BffRequestError) {
    if (err.mapped.bannerKind === 'composition') {
      return { kind: 'composition', message: err.mapped.message };
    }
    if (err.mapped.bannerKind === 'identity') {
      return { kind: 'identity', message: err.mapped.message };
    }

    const body = err.http.error as Record<string, unknown> | null | undefined;
    if (body && typeof body === 'object') {
      const detail = typeof body['detail'] === 'string' ? body['detail'].trim() : '';
      const title = typeof body['title'] === 'string' ? body['title'].trim() : '';
      const code = typeof body['code'] === 'string' ? body['code'].trim() : '';
      const text = detail || title;
      if (text) {
        return {
          kind: 'refusal',
          message: code ? `${code}: ${text}` : text,
        };
      }
    }

    return {
      kind: 'refusal',
      message: err.mapped.message || fallback,
    };
  }

  return { kind: 'refusal', message: fallback };
}
